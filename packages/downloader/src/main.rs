use downloader::channel::subscriber;
use downloader::download::{DownloadResponse, Downloader};
use downloader::error::Result;
use downloader::http::{HTTPPool, HTTPReqwester};
use downloader::meta::get_chair_lock;
use downloader::store::listener::EntryListener;
use downloader::store::NpmBucketStoreExecuteResult;
use downloader::store::TocIndex;
use downloader::toc_index_store::TocIndexStore;
use downloader::util::BlackHole;
use downloader::NpmStore;
use futures::future::join_all;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::io::AsyncReadExt;
use tokio::sync::mpsc::Receiver;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

async fn black_hole_download() {
    let lock = get_chair_lock();
    let pkg_requests = lock.list_all_packages();
    let pool = HTTPPool::new(50).unwrap();
    let bucket = 50;
    let (sx, rx_list) = subscriber(bucket);
    let handlers: Vec<JoinHandle<()>> = rx_list
        .into_iter()
        .map(|mut rx: Receiver<DownloadResponse>| {
            tokio::spawn(async move {
                while let Some(mut response) = rx.recv().await {
                    let mut black_hole = BlackHole {};
                    tokio::io::copy(&mut response.reader, &mut black_hole).await;
                }
            })
        })
        .collect();
    pool.batch_execute(pkg_requests, sx).await;
    join_all(handlers).await;
}

async fn file_download() {
    let lock = get_chair_lock();
    let pkg_requests = lock.list_all_packages();
    let home = std::env::home_dir().unwrap();
    let bucket_size = 5;
    let download_dir = home.join("tar_buckets");

    let (sx, mut rx) = tokio::sync::mpsc::channel(1);
    let whitelist = vec![String::from("*/package.json")];
    let listener = EntryListener::new(whitelist, Arc::new(sx));
    tokio::spawn(async move {
        while let Some(entry) = rx.recv().await {
            if let Some(mut entry) = entry {
                let mut content = String::new();
                entry.reader.read_to_string(&mut content).await;
            } else {
                break;
            }
        }
    });

    let http_pool = HTTPPool::new(bucket_size * 2).unwrap();
    let store = NpmStore::new(
        bucket_size,
        download_dir.as_path(),
        Duration::from_secs(10),
        Some(listener),
    )
    .await
    .unwrap();
    let toc_index_store = Arc::new(TocIndexStore::new());
    let downloader = Downloader::new(store, http_pool, toc_index_store.clone(), 1);
    downloader.batch_download(pkg_requests).await;
    toc_index_store.dump();
}

#[tokio::main]
async fn main() {
    file_download().await;
}
