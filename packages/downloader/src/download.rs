use crate::http::{HTTPReqwester, ResponseStreamReader};
use crate::meta::PackageRequest;
use std::collections::HashMap;
use std::fmt::{Debug, Display};
use std::io::Error as IoError;
use std::sync::Arc;
use std::time::SystemTime;

use crate::error::Error;
use crate::pool::{Pool, PoolError, PoolExecutorError};
use crate::store::{NpmBucketStoreExecuteCommand, NpmBucketStoreExecuteResult};
use crate::toc_index_store::TocIndexStore;
use crate::{HTTPPool, NpmStore, TocIndex};
use derivative::Derivative;
use futures_util::future::try_join_all;
use log::{info, warn};
use tokio::io::AsyncRead;
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;

#[derive(Derivative)]
#[derivative(Debug)]
pub struct DownloadResponse {
    pub pkg_request: PackageRequest,
    #[derivative(Debug = "ignore")]
    pub reader: ResponseStreamReader,
}

pub struct Downloader {
    store: Arc<NpmStore>,
    http_pool: Arc<HTTPPool>,
    toc_index_store: Arc<TocIndexStore>,
    retry_time: u8,
}

impl<E: Display + Send + Sync + Unpin> From<PoolError<PackageRequest, E>> for Error {
    fn from(e: PoolError<PackageRequest, E>) -> Error {
        match e {
            PoolError::JoinError(e) => Error::BatchDownloadError(None),
            PoolError::BatchError(errs) => {
                let failed_list = errs
                    .into_iter()
                    .map(|e| match e {
                        PoolExecutorError::ExecuteError(r, e) => {
                            warn!("request {:?} failed {}", r, e);
                            r
                        }
                        PoolExecutorError::SendError(r) => {
                            warn!("send request {:?} result failed", r);
                            r
                        }
                    })
                    .collect();
                Error::BatchDownloadError(Some(failed_list))
            }
        }
    }
}

impl Downloader {
    pub fn new(
        store: NpmStore,
        http_pool: HTTPPool,
        toc_index_store: Arc<TocIndexStore>,
        retry_time: u8,
    ) -> Downloader {
        Downloader {
            store: Arc::new(store),
            http_pool: Arc::new(http_pool),
            toc_index_store,
            retry_time,
        }
    }

    pub async fn shutdown(self) -> Result<(), Error> {
        let store = match Arc::try_unwrap(self.store) {
            Ok(store) => store,
            Err(_) => return Err(Error::ArcBusy(String::from("downloader store is busy"))),
        };
        store.shutdown().await?;
        Ok(())
    }

    pub async fn batch_download(&self, requests: Vec<PackageRequest>) -> Result<(), Error> {
        let mut retry_time = 0u8;
        let max_retry_time = self.retry_time;
        let mut requests = requests;
        loop {
            match self.do_batch_download(requests).await {
                Ok(res) => return Ok(res),
                Err(e) => {
                    match e {
                        Error::BatchDownloadError(Some(failed_requests)) => {
                            if retry_time >= max_retry_time {
                                return Err(Error::BatchDownloadError(Some(failed_requests)));
                            }
                            warn!("download failed {:?} retry time {}", &failed_requests, retry_time);
                            requests = failed_requests;
                            retry_time += 1;
                        }
                        e => {
                            return Err(e);
                        }
                    }

                }
            }
        }
    }

    // err none 表示全部失败
    // err some 表示部分失败
    async fn do_batch_download(&self, requests: Vec<PackageRequest>) -> Result<(), Error> {
        let (response_sender, mut response_receiver) =
            mpsc::channel(self.store.bucket_size as usize * 2);
        let (store_request_sender, mut store_request_receiver) =
            mpsc::channel(self.store.bucket_size as usize * 2);
        let (store_sender, mut store_receiver) = mpsc::channel(self.store.bucket_size as usize);
        let http_pool = self.http_pool.clone();
        let request_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            http_pool.batch_execute(requests, response_sender).await?;
            Ok(())
        });
        let map_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            while let Some(DownloadResponse {
                pkg_request,
                reader,
            }) = response_receiver.recv().await
            {
                if let Err(_) = store_request_sender
                    .send(NpmBucketStoreExecuteCommand {
                        request: pkg_request,
                        reader: Box::new(reader) as Box<dyn AsyncRead + Send + Sync + Unpin>,
                    })
                    .await
                {
                    break;
                }
            }
            Ok(())
        });
        let store = self.store.clone();
        let store_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            store
                .batch_execute(store_request_receiver, store_sender)
                .await?;
            Ok(())
        });
        let toc_index_store = self.toc_index_store.clone();
        let toc_store_handler: JoinHandle<Result<(), Error>> = tokio::spawn(async move {
            while let Some(NpmBucketStoreExecuteResult {
                toc_index,
                tar_name,
                pkg_request,
                ..
            }) = store_receiver.recv().await
            {
                toc_index_store.add_package(
                    pkg_request.name(),
                    pkg_request.version(),
                    &tar_name,
                    toc_index,
                );
            }
            Ok(())
        });
        request_handler.await??;
        map_handler.await??;
        info!("all request done");
        store_handler.await??;
        info!("all store done");
        toc_store_handler.await??;
        info!("all toc store done");
        Ok(())
    }

    pub async fn download_pkg(&self, request: PackageRequest) -> Result<(), Error> {
        let executor = self.http_pool.create_download_request(request).await;
        let DownloadResponse {
            pkg_request,
            reader,
        } = executor.execute().await?;
        let NpmBucketStoreExecuteResult {
            toc_index,
            tar_name,
            ..
        } = self.store.add_package(pkg_request.clone(), reader).await?;
        self.toc_index_store.add_package(
            pkg_request.name(),
            pkg_request.version(),
            &tar_name,
            toc_index,
        );
        Ok(())
    }
}
