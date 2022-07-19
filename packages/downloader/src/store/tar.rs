use crate::error::Error;
use crate::store::stargz::{TocEntry, TocIndex};
use crate::util::{BlackHole, CountWriter, HashWriter, MultiWriter};

use futures_util::StreamExt;
use std::convert::TryInto;
use std::path::{Path, PathBuf};

use crate::store::listener::{EntryListener, PackageEntry};
use std::borrow::Borrow;
use std::sync::Arc;
use tokio::io::{self, AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, Result as IoResult};
use tokio::sync::mpsc::Sender;
use tokio_tar::{Archive, Entry, EntryType, Header};

pub struct TarConcater {}

impl TryInto<TocEntry> for &Header {
    type Error = Error;

    fn try_into(self) -> Result<TocEntry, Self::Error> {
        let entry = TocEntry {
            // FIXME: 需要支持 long name 的情况，要从 entry 里取
            name: PathBuf::from(self.path().unwrap()),
            toc_type: match self.entry_type() {
                EntryType::Regular => String::from("reg"),
                EntryType::Link => String::from("hardlink"),
                EntryType::Symlink => String::from("symlink"),
                EntryType::Char => String::from("char"),
                EntryType::Block => String::from("block"),
                EntryType::Directory => String::from("dir"),
                EntryType::Fifo => String::from("fifo"),
                _ => {
                    return Err(Error::FormatError(String::from("not supoort type")));
                } // todo!("not supoort type: {:?}", self.entry_type()),
            },
            size: self.size().unwrap(),
            link_name: self
                .link_name()
                .unwrap()
                .map_or_else(|| PathBuf::from(""), PathBuf::from),
            mode: self.mode().unwrap(),
            // FIXME: tokio-tar 读 uid 时会失败
            // Custom { kind: Other, error: "numeric field was not a number:  when getting uid for package/LICENSE" }
            uid: 0, // header.uid().unwrap() as u32,
            gid: 0, // header.gid().unwrap() as u32,
            uname: self
                .username()
                .unwrap()
                .map_or_else(|| String::from(""), String::from),
            gname: self
                .groupname()
                .unwrap()
                .map_or_else(|| String::from(""), String::from),
            offset: 0,
            dev_major: 0,
            dev_minor: 0,
            xattrs: Default::default(),
            digest: "".to_string(),
            chunk_offset: 0,
            chunk_size: 0,
        };
        Ok(entry)
    }
}

impl TarConcater {
    pub fn new_tar_header(header: &Header, tar_prefix: &str) -> IoResult<Header> {
        let mut header = header.clone();
        let file_path = header.path()?;
        let file_path_without_package = file_path.components().skip(1).collect::<PathBuf>();
        let new_path = Path::new(tar_prefix).join(file_path_without_package);
        header.set_path(new_path)?;
        header.set_cksum();
        Ok(header)
    }

    pub async fn append<R: AsyncRead + Send + Sync + Unpin, W: AsyncWrite + Unpin + Send + Sync>(
        mut writer: W,
        start: u64,
        tar_prefix: &str,
        reader: R,
        entry_listener: Option<&EntryListener>,
    ) -> IoResult<TocIndex> {
        let mut read_archive = Archive::new(reader);
        let mut entries = read_archive.entries()?;
        let mut index = TocIndex::new();
        let mut writer = CountWriter::new(&mut writer);

        while let Some(file) = entries.next().await {
            // let mut writer = GzipEncoder::new(&mut writer);
            let mut f = file?;
            // 1. 将 package/* 重命名为 ${name}@${version}/*
            let header = TarConcater::new_tar_header(f.header(), tar_prefix)?;
            // 2. 写入 header
            writer.write_all(header.as_bytes()).await?;
            // 3. 记录 entry payload 写入 offset
            let offset = start + writer.get_written_bytes() as u64;
            // 4. 记录 entry hash digest
            let mut writer = HashWriter::new(&mut writer);

            let len = if let Some(entry_listener) = entry_listener {
                let entry_name = f.header().path()?;
                if entry_listener.should_send_entry(&entry_name) {
                    let (mut sx, rx) = tokio::io::duplex(1024 * 4);
                    let mut multi_writer = MultiWriter::new(&mut writer, &mut sx);
                    entry_listener
                        .send_entry(PackageEntry {
                            pkg_name: String::from(tar_prefix),
                            entry_name: String::from(entry_name.as_ref().to_string_lossy()),
                            reader: Box::new(rx),
                        })
                        .await;
                    let len = io::copy(&mut f, &mut multi_writer).await?;
                    multi_writer.flush().await?;
                    len
                } else {
                    io::copy(&mut f, &mut writer).await?
                }
            } else {
                io::copy(&mut f, &mut writer).await?
            };
            let digest = writer.digest_finalize();

            // Copy from Builder
            // Pad with zeros if necessary.
            let buf = [0; 512];
            let remaining = 512 - (len % 512);
            if remaining < 512 {
                writer.write_all(&buf[..remaining as usize]).await?;
            }

            // let count_writer = writer.into_inner();
            let entry: Result<TocEntry, Error> = (&header).try_into();
            if let Ok(mut entry) = entry {
                entry.digest = format!("sha256:{}", digest.to_string());
                entry.offset = offset;
                index.entries.push(entry);
            }
        }
        Ok(index)
    }
}

#[cfg(test)]
mod test {
    use crate::util::{BlackHole, HashWriter};
    use serde::de::Unexpected::Bytes;
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    async fn test_hash() {
        let mut writer = BlackHole;
        let mut writer = HashWriter::new(&mut writer);
        let bytes = "hello".as_bytes();
        writer.write_all(bytes).await.unwrap();
        let digest = writer.digest_finalize();
        let digest = format!("sha256:{}", digest.to_string());
        println!("digest: {:?}: ", digest);
    }
}
