#[macro_use]
extern crate napi_derive;

use napi::{CallContext, Callback, Env, Error, JsFunction, JsObject, NapiRaw, Status};

use ctor::ctor;
use downloader::download::Downloader;
use downloader::error::Error as TnpmError;
use downloader::http::{HTTPPool, HTTPReqwester};
use downloader::store::listener::{EntryListener, PackageEntry};
use downloader::toc_index_store::{TocIndexStore, TocIndexStoreData, TocIndicesMap, TocMap};
use downloader::{
    download as batch_download, DownloadOptions, NpmStore, PackageRequest, PackageRequestBuilder,
    TocIndex,
};
use log::LevelFilter;
use napi::sys::napi_value;
use napi::threadsafe_function::ErrorStrategy;
use napi::threadsafe_function::{
    ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode,
};
use simple_logger::SimpleLogger;
use std::collections::HashMap;
use std::fmt::format;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::AsyncReadExt;
use tokio::sync::mpsc::Receiver;

#[napi(object)]
struct JsDownloadOptions {
    pub download_dir: String,
    pub download_timeout: u32,
    pub bucket_count: u32,
    pub http_concurrent_count: u32,
    pub entry_whitelist: Option<Vec<String>>,
    pub entry_listener: Option<JsFunction>,
    pub retry_time: Option<u32>,
}

#[napi(object)]
#[derive(Debug)]
struct JsPackageRequest {
    pub name: Option<String>,
    pub version: Option<String>,
    pub sha: Option<String>,
    pub url: Option<String>,
}

#[napi(object)]
#[derive(Debug)]
struct JsPackageEntry {
    pub pkg_name: String,
    pub content: String,
    pub entry_name: String,
}

fn parse_download_options(
    env: Env,
    mut options: JsDownloadOptions,
) -> Result<DownloadOptions, Error> {
    if options.bucket_count > u8::MAX as u32 {
        return Err(Error::new(
            Status::InvalidArg,
            format!(
                "bucketCount {} should less than {}",
                options.bucket_count,
                u8::MAX
            ),
        ));
    }

    if options.http_concurrent_count > u8::MAX as u32 {
        return Err(Error::new(
            Status::InvalidArg,
            format!(
                "httpConcurrentCount {} should less than {}",
                options.http_concurrent_count,
                u8::MAX
            ),
        ));
    }

    let retry_time = if let Some(retry_time) = options.retry_time {
        retry_time
    } else {
        3
    };

    if retry_time > u8::MAX as u32 {
        return Err(Error::new(
            Status::InvalidArg,
            format!(
                "retry {} should less than {}",
                retry_time,
                u8::MAX
            ),
        ));
    }

    let entry_listener = if let Some(entry_listener) = options.entry_listener.take() {
        let listener = create_entry_listener(env, entry_listener, options.entry_whitelist);
        Some(listener)
    } else {
        None
    };

    Ok(DownloadOptions {
        download_dir: options.download_dir,
        bucket_count: options.bucket_count as u8,
        http_concurrent_count: options.http_concurrent_count as u8,
        download_timeout: Duration::from_millis(options.download_timeout as u64),
        entry_listener,
        retry_time: retry_time as u8,
    })
}

fn parse_package_request(request: JsPackageRequest) -> Result<PackageRequest, Error> {
    let mut builder = PackageRequestBuilder::new();
    if let Some(name) = request.name {
        builder = builder.name(&name);
    }
    if let Some(version) = request.version {
        builder = builder.version(&version);
    }
    if let Some(sha) = request.sha {
        builder = builder.sha(&sha);
    }
    if let Some(url) = request.url {
        builder = builder.url(&url);
    }
    builder.build().map_err(|e| {
        let message = format!("{:?}", e);
        Error::new(Status::InvalidArg, message)
    })
}

fn parse_package_requests(requests: Vec<JsPackageRequest>) -> Result<Vec<PackageRequest>, Error> {
    let mut download_requests = Vec::with_capacity(requests.len());
    for request in requests {
        let request = parse_package_request(request)?;
        download_requests.push(request);
    }
    Ok(download_requests)
}

fn callback_new_entry(ctx: ThreadSafeCallContext<JsPackageEntry>) -> Result<Vec<JsObject>, Error> {
    let mut entry = ctx.env.create_object()?;
    entry.set("pkgName", ctx.value.pkg_name);
    entry.set("entryName", ctx.value.entry_name);
    entry.set("content", ctx.value.content);
    Ok(vec![entry])
}

async fn handle_new_entry(
    mut rx: Receiver<Option<PackageEntry>>,
    entry_callback: ThreadsafeFunction<JsPackageEntry, ErrorStrategy::Fatal>,
) {
    while let Some(entry) = rx.recv().await {
        match entry {
            Some(mut entry) => {
                let mut content = String::new();
                if let Ok(_) = (&mut entry.reader).read_to_string(&mut content).await {
                    let entry = JsPackageEntry {
                        pkg_name: entry.pkg_name,
                        entry_name: entry.entry_name,
                        content,
                    };
                    entry_callback.call(entry, ThreadsafeFunctionCallMode::Blocking);
                }
            }
            None => break,
        }
    }
}

fn create_entry_listener(
    env: Env,
    entry_callback: JsFunction,
    entry_whitelist: Option<Vec<String>>,
) -> EntryListener {
    let entry_whitelist = match entry_whitelist {
        Some(entry_whitelist) => entry_whitelist,
        None => vec![String::from("*")],
    };
    let (sx, mut rx) = tokio::sync::mpsc::channel(1);
    let entry_callback = entry_callback
        .create_threadsafe_function(0, callback_new_entry)
        .expect("create callback failed");

    env.execute_tokio_future(
        async move {
            let entry_callback: ThreadsafeFunction<JsPackageEntry, ErrorStrategy::Fatal> =
                entry_callback.clone();
            handle_new_entry(rx, entry_callback).await;
            Ok(())
        },
        |&mut env, data: ()| env.get_undefined(),
    );
    EntryListener::new(entry_whitelist, Arc::new(sx))
}

#[napi]
fn download(
    env: Env,
    requests: Vec<JsPackageRequest>,
    options: JsDownloadOptions,
) -> Result<JsObject, Error> {
    let options = parse_download_options(env, options)?;
    let requests = parse_package_requests(requests)?;
    env.execute_tokio_future(
        async move {
            match batch_download(requests, options).await {
                Ok(toc_index) => {
                    let result_str =
                        serde_json::to_string(&toc_index).expect("serialize result failed");
                    Ok(result_str)
                }
                Err(e) => {
                    let message = format!("{:?}", e);
                    Err(Error::new(Status::FunctionExpected, message))
                }
            }
        },
        |&mut env, data| env.create_string_from_std(data),
    )
}

#[napi(js_name = "Downloader")]
struct JsDownloader {
    options: DownloadOptions,
    inner: Option<Downloader>,
    toc_index_store: Arc<TocIndexStore>,
}

#[napi]
impl JsDownloader {
    #[napi(constructor)]
    pub fn new(env: Env, options: JsDownloadOptions) -> Result<Self, Error> {
        let options = parse_download_options(env, options)?;
        let toc_index_store = Arc::new(TocIndexStore::new());
        Ok(JsDownloader {
            options,
            toc_index_store,
            inner: None,
        })
    }

    #[napi]
    pub fn init(&'static mut self, env: Env) -> Result<JsObject, Error> {
        env.execute_tokio_future(
            async move {
                if self.inner.is_some() {
                    return Ok(());
                }
                let http_pool = HTTPPool::new(self.options.http_concurrent_count).map_err(|e| {
                    Error::new(
                        Status::FunctionExpected,
                        format!("create reqwester failed: {:?}", e),
                    )
                })?;
                let store = NpmStore::new(
                    self.options.bucket_count,
                    Path::new(&self.options.download_dir),
                    self.options.download_timeout,
                    self.options.entry_listener.take(),
                )
                .await
                .map_err(|e| {
                    Error::new(
                        Status::FunctionExpected,
                        format!("create npm store failed: {:?}", e),
                    )
                })?;
                let downloader = Downloader::new(store, http_pool, self.toc_index_store.clone(), self.options.retry_time);
                self.inner = Some(downloader);
                Ok(())
            },
            |&mut env, data| env.get_undefined(),
        )
    }

    #[napi]
    pub async fn download(&self, request: JsPackageRequest) -> Result<(), Error> {
        let downloader = self.inner.as_ref().ok_or_else(|| {
            Error::new(
                Status::FunctionExpected,
                String::from("Downloader is destroyed!"),
            )
        })?;
        let request = parse_package_request(request)?;
        downloader.download_pkg(request).await.map_err(|e| {
            Error::new(
                Status::FunctionExpected,
                format!("download package failed: {:?}", e),
            )
        })?;
        Ok(())
    }

    #[napi]
    pub async fn batch_downloads(&self, js_requests: Vec<JsPackageRequest>) -> Result<(), Error> {
        let downloader = self.inner.as_ref().ok_or_else(|| {
            Error::new(
                Status::FunctionExpected,
                String::from("Downloader is destroyed!"),
            )
        })?;
        let mut requests = Vec::with_capacity(js_requests.len());
        for request in js_requests {
            let request = parse_package_request(request)?;
            requests.push(request);
        }
        // TODO 要把失败的丢回去
        downloader.batch_download(requests).await.map_err(|e| {
            Error::new(
                Status::FunctionExpected,
                format!("download package failed: {:?}", e),
            )
        })?;
        Ok(())
    }

    #[napi]
    pub fn dump(&self) -> String {
        let data = self.toc_index_store.dump();
        serde_json::to_string(&data).expect("serialize result failed")
    }

    #[napi]
    pub async fn shutdown(&mut self) -> Result<(), Error> {
        if let Some(downloader) = self.inner.take() {
            downloader.shutdown().await.map_err(|e| {
                Error::new(
                    Status::FunctionExpected,
                    format!("shutdown downloader failed: {:?}", e),
                )
            })?;
        }
        Ok(())
    }
}

#[ctor]
fn setup_logger() {
    if let Err(e) = SimpleLogger::new()
        .with_level(LevelFilter::Warn)
        .env()
        .init()
    {
        eprintln!("init logger failed {:?}", e);
    }
}
