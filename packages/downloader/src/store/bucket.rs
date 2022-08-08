use crate::error::{Error, Result};
use crate::meta::PackageRequest;
use crate::store::stargz::TocIndex;
use crate::store::tar::TarConcater;
use crate::util::{CountWriter, MultiWriter};
use async_compression::tokio::bufread::GzipDecoder;
use log::{info, warn};
use nix::fcntl;
use std::os::unix::prelude::AsRawFd;
use std::sync::Arc;
use std::time::Duration;
use tokio_tar::{Archive, Entry};

use crate::store::listener::EntryListener;
use tokio::fs::File;
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt, BufReader, BufWriter};
use tokio::sync::mpsc::Sender;
use tokio::time::timeout;

pub struct NpmBucketStore {
    pub name: String,
    timeout: Duration,
    inner: BufWriter<File>,
    entry_listener: Option<EntryListener>,
    position: u64,
}

impl NpmBucketStore {
    async fn prepare_file(&mut self) -> Result<()> {
        self.fix_length().await?;
        self.lock_file()?;
        Ok(())
    }

    async fn fix_length(&mut self) -> Result<()> {
        // fix file size
        self.inner.get_mut().set_len(self.position).await?;
        Ok(())
    }

    fn get_fd(&self) -> std::os::unix::io::RawFd {
        self.inner.get_ref().as_raw_fd()
    }

    fn lock_file(&self) -> Result<()> {
        // lock current file
        let fd = self.get_fd();
        fcntl::flock(fd, fcntl::FlockArg::LockExclusiveNonblock)?;
        Ok(())
    }

    fn unlock_file(&self) -> Result<()> {
        // unlock current file
        let fd = self.get_fd();
        fcntl::flock(fd, fcntl::FlockArg::UnlockNonblock)?;
        Ok(())
    }

    pub async fn new(name: String, writer: File, position: u64, timeout: Duration) -> Result<Self> {
        NpmBucketStore::new_with_entry_listener(name, writer, position, timeout, None).await
    }

    pub async fn new_with_entry_listener(
        name: String,
        writer: File,
        position: u64,
        timeout: Duration,
        entry_listener: Option<EntryListener>,
    ) -> Result<Self> {
        let mut store = NpmBucketStore {
            name,
            position,
            timeout,
            inner: BufWriter::with_capacity(1024 * 1024 * 4, writer),
            entry_listener: entry_listener,
        };
        store.prepare_file().await?;
        Ok(store)
    }

    async fn do_add_package<R: AsyncRead + Send + Sync + Unpin>(
        &mut self,
        pkg: &PackageRequest,
        reader: R,
    ) -> Result<(usize, TocIndex)> {
        let position = self.position;
        info!("{} add package {} at {}", self.name, pkg.name, position);

        // let mut buf_writer = BufWriter::with_capacity(1024 * 512, &mut self.inner);
        let mut count_writer = CountWriter::new(&mut self.inner);
        let mut gz_decoder = GzipDecoder::new(BufReader::new(reader));

        let tar_prefix = pkg.tar_prefix();
        match TarConcater::append(
            &mut count_writer,
            self.position,
            &tar_prefix,
            &mut gz_decoder,
            self.entry_listener.as_ref(),
        )
        .await
        {
            Ok(toc_index) => {
                let written_bytes = count_writer.get_written_bytes();
                self.position = position + written_bytes as u64;
                info!(
                    "{} add package {} succeed new position {}",
                    self.name, pkg.name, self.position
                );
                Ok((written_bytes, toc_index))
            }
            Err(e) => {
                self.fix_length().await?;
                warn!(
                    "{} add package failed {} rollback position {} {:?}",
                    self.name, pkg.name, self.position, e
                );
                Err(Error::from(e))
            }
        }
    }

    pub async fn add_package<R: AsyncRead + Send + Sync + Unpin>(
        &mut self,
        pkg: &PackageRequest,
        reader: R,
    ) -> Result<(usize, TocIndex)> {
        let res = timeout(self.timeout, self.do_add_package(pkg, reader)).await?;
        res
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.inner.flush().await?;
        self.inner.shutdown().await?;
        self.unlock_file()?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::meta::PackageRequestBuilder;
    use crate::store::bucket::NpmBucketStore;
    use std::time::Duration;

    use tokio::fs::OpenOptions;
    use tokio::io::AsyncReadExt;

    #[tokio::test]
    async fn add_tar_should_work() {
        let bucket_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open("/tmp/bucket_1.stgz")
            .await
            .unwrap();
        let current_dir = std::env::current_dir().unwrap();

        let mut store = NpmBucketStore::new(
            String::from("bucket_1.stgz"),
            bucket_file,
            0,
            Duration::from_secs(10),
        )
        .await
        .unwrap();
        let tar_file = current_dir.join("test/fixtures/tar/acorn-5.7.4.tgz");
        let tar_file = OpenOptions::new()
            .create(false)
            .append(false)
            .read(true)
            .write(false)
            .open(tar_file)
            .await
            .unwrap();
        let pkg = PackageRequestBuilder::new()
            .name("acorn")
            .version("5.7.4")
            .sha("mock_sha")
            .url("mock_url")
            .build()
            .unwrap();
        let res = store.add_package(&pkg, tar_file).await;
        assert_ne!(store.position, 0);
        assert!(res.is_ok());

        store.shutdown().await.unwrap();
    }

    #[tokio::test]
    async fn add_bad_tar_should_failed() {
        let bucket_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open("/tmp/bucket_2.stgz")
            .await
            .unwrap();
        let current_dir = std::env::current_dir().unwrap();

        let mut store = NpmBucketStore::new(String::from("bucket_2.stgz"), bucket_file, 0, Duration::from_secs(10))
            .await
            .unwrap();
        let tar_file = current_dir.join("test/fixtures/tar/acorn-5.7.4.tgz");
        let tar_file = OpenOptions::new()
            .create(false)
            .append(false)
            .read(true)
            .write(false)
            .open(tar_file)
            .await
            .unwrap();
        let pkg = PackageRequestBuilder::new()
            .name("aria-query")
            .version("4.2.2")
            .sha("mock_sha")
            .url("mock_url")
            .build()
            .unwrap();
        let res = store.add_package(&pkg, tar_file).await;
        assert_ne!(store.position, 0);
        assert!(res.is_ok());
        let new_position = store.position;

        let bad_tar = current_dir.join("test/fixtures/tar/acorn-5.7.4.tgz");
        let mut bad_tar = OpenOptions::new()
            .create(false)
            .append(false)
            .read(true)
            .write(false)
            .open(bad_tar)
            .await
            .unwrap();
        let mut bad_tar_buf = Vec::new();
        bad_tar.read_to_end(&mut bad_tar_buf).await.unwrap();
        let bad_tar = &bad_tar_buf[0..(bad_tar_buf.len() - 1024 * 127)];

        let pkg = PackageRequestBuilder::new()
            .name("antd-mobile")
            .version("2.3.4")
            .sha("mock_sha")
            .url("mock_url")
            .build()
            .unwrap();

        let res = store.add_package(&pkg, bad_tar).await;
        assert!(res.is_err());
        assert_eq!(store.position, new_position);
        store.shutdown().await.unwrap();
    }
}
