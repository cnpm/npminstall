use crate::download::DownloadResponse;
use crate::error::{Error, Result as ProjectResult};
use crate::http::reqwester::HTTPReqwester;
use crate::meta::PackageRequest;
use futures::future::join_all;
use std::io::Error as IoError;

use std::sync::Arc;

use tokio::sync::mpsc::Sender;

use crate::pool::{Command, Executor, Pool, PoolError, PoolRequest};
use async_trait::async_trait;
use futures_util::future::try_join_all;
use std::time::{Duration, SystemTime};
use tokio::task::JoinHandle;

pub struct HTTPPool {
    max_concurrent: u8,
    reqwesters: Pool<HTTPReqwester>,
}

impl Command for PackageRequest {
    type CommandDesc = PackageRequest;

    fn get_id(&self) -> &str {
        self.url()
    }

    fn get_desc(&self) -> Self::CommandDesc {
        self.clone()
    }
}

#[async_trait]
impl Executor for HTTPReqwester {
    type Command = PackageRequest;
    type OkType = DownloadResponse;
    type ErrorType = IoError;

    async fn execute(
        &mut self,
        command: Self::Command,
    ) -> std::result::Result<DownloadResponse, IoError> {
        self.request(command).await
    }
}

impl HTTPPool {
    pub fn new(max_concurrent: u8) -> ProjectResult<HTTPPool> {
        let client_builder = reqwest::ClientBuilder::new()
            .tcp_keepalive(Duration::from_secs(60))
            .connection_verbose(true)
            .redirect(reqwest::redirect::Policy::limited(10))
            .http1_only()
            .use_rustls_tls();
        let client_builder = HTTPReqwester::prepare_dns_resolve(client_builder)?;
        let client = client_builder.build()?;
        let client = Arc::new(client);
        let mut reqwesters = Vec::with_capacity(max_concurrent as usize);
        for _ in 0..max_concurrent {
            let reqwester = HTTPReqwester::new_with_client(client.clone());
            reqwesters.push(reqwester);
        }
        let reqwesters = Pool::new(String::from("http_poll"), reqwesters);

        Ok(HTTPPool {
            max_concurrent,
            reqwesters,
        })
    }

    pub async fn batch_execute(
        &self,
        commands: Vec<PackageRequest>,
        sender: Sender<DownloadResponse>,
    ) -> Result<(), PoolError<PackageRequest, IoError>> {
        self.reqwesters
            .batch_execute_with_sender(commands, sender)
            .await
    }

    pub async fn create_download_request(
        &self,
        request: PackageRequest,
    ) -> PoolRequest<HTTPReqwester> {
        self.reqwesters.create_request(request).await
    }
}

#[cfg(test)]
mod test {
    use crate::download::DownloadResponse;
    use crate::http::HTTPPool;
    use crate::meta::{PackageRequest, PackageRequestBuilder};
    use crate::test::get_download_url;
    use std::sync::Arc;
    use tokio::io::AsyncReadExt;
    use tokio::join;
    use tokio::sync::mpsc;

    #[tokio::test]
    async fn test_pool() {
        let pool = HTTPPool::new(2).unwrap();
        let (sx, mut rx) = mpsc::channel::<DownloadResponse>(2);
        let download_handler = tokio::spawn(async move {
            while let Some(mut response) = rx.recv().await {
                let mut res: Vec<u8> = vec![];
                let read_res = response.reader.read_to_end(&mut res).await;
                assert!(read_res.is_ok());
                assert!(read_res.unwrap() > 0);
            }
        });
        let download_tasks: Vec<PackageRequest> = get_download_url()[0..4]
            .iter()
            .enumerate()
            .map(|(index, url)| {
                PackageRequestBuilder::new()
                    .name(&format!("mock-pkg-{}", index))
                    .version("1.0.0")
                    .url(url)
                    .sha("mock_sha")
                    .build()
                    .unwrap()
            })
            .collect();
        let result = pool
            .batch_execute(download_tasks, sx)
            .await;
        assert!(result.is_ok());
        join!(download_handler).0.unwrap();
    }
}
