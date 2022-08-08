use bytes::{BufMut, Bytes, BytesMut};
use futures::future::join_all;
use sha2::{Digest, Sha256};
use std::cmp::min;
use std::collections::VecDeque;
use std::io::Error as IoError;
use std::io::{IoSlice, Result as IoResult};
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Duration;
use tokio::io::{AsyncWrite, AsyncWriteExt};

use crate::store::digest::{DigestHasher, RafsDigest};

pub struct BlackHole;

impl AsyncWrite for BlackHole {
    fn poll_write(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<Result<usize, IoError>> {
        Poll::Ready(Ok(buf.len()))
    }

    fn poll_flush(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Result<(), IoError>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Result<(), IoError>> {
        Poll::Ready(Ok(()))
    }
}

pub struct MultiWriter<W1: AsyncWrite + Sync + Unpin, W2: AsyncWrite + Sync + Unpin> {
    one: AllWriter<W1>,
    two: AllWriter<W2>,
}

impl<W1: AsyncWrite + Sync + Unpin, W2: AsyncWrite + Sync + Unpin> MultiWriter<W1, W2> {
    pub fn new(one: W1, two: W2) -> Self {
        MultiWriter {
            one: AllWriter::new(one),
            two: AllWriter::new(two),
        }
    }

    pub fn into_inner(self: Self) -> (W1, W2) {
        let MultiWriter { one, two } = self;
        (one.into_inner(), two.into_inner())
    }
}

impl<W1: AsyncWrite + Sync + Unpin, W2: AsyncWrite + Sync + Unpin> AsyncWrite
    for MultiWriter<W1, W2>
{
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<IoResult<usize>> {
        match futures::ready!(Pin::new(&mut self.one).poll_write(cx, buf)) {
            Ok(_) => {}
            Err(e) => return Poll::Ready(Err(e)),
        };
        match futures::ready!(Pin::new(&mut self.two).poll_write(cx, buf)) {
            Ok(_) => {}
            Err(e) => return Poll::Ready(Err(e)),
        };
        Poll::Ready(Ok(buf.len()))
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        match futures::ready!(Pin::new(&mut self.one).poll_flush(cx)) {
            Ok(_) => {}
            Err(e) => return Poll::Ready(Err(e)),
        };
        match futures::ready!(Pin::new(&mut self.two).poll_flush(cx)) {
            Ok(_) => {}
            Err(e) => return Poll::Ready(Err(e)),
        };
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        match futures::ready!(Pin::new(&mut self.one).poll_shutdown(cx)) {
            Ok(_) => {}
            Err(e) => return Poll::Ready(Err(e)),
        };
        match futures::ready!(Pin::new(&mut self.two).poll_shutdown(cx)) {
            Ok(_) => {}
            Err(e) => return Poll::Ready(Err(e)),
        };
        Poll::Ready(Ok(()))
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        bufs: &[IoSlice<'_>],
    ) -> Poll<IoResult<usize>> {
        todo!()
    }

    fn is_write_vectored(&self) -> bool {
        false
    }
}

pub struct AllWriter<W: AsyncWrite + Sync + Unpin> {
    bytes: VecDeque<u8>,
    inner: W,
}

impl<W: AsyncWrite + Sync + Unpin> AllWriter<W> {
    fn new(w: W) -> Self {
        AllWriter {
            bytes: VecDeque::with_capacity(1024 * 4),
            inner: w,
        }
    }

    fn into_inner(self: Self) -> W {
        self.inner
    }
}

impl<W: AsyncWrite + Sync + Unpin> AsyncWrite for AllWriter<W> {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<IoResult<usize>> {
        let buf_len = buf.len();
        // extend/make_contiguous/to_vec/poll_write 四次拷贝...
        self.bytes.extend(buf);
        let bytes = self.bytes.make_contiguous();
        let bytes = bytes.to_vec();
        let bytes = bytes.as_slice();
        match Pin::new(&mut self.inner).poll_write(cx, bytes) {
            Poll::Ready(Ok(n)) => {
                self.bytes = self.bytes.split_off(n);
                return Poll::Ready(Ok(buf_len));
            }
            Poll::Ready(Err(e)) => Poll::Ready(Err(e)),
            Poll::Pending => {
                return Poll::Ready(Ok(buf_len));
            }
        }
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        while !self.bytes.is_empty() {
            let bytes = self.bytes.make_contiguous();
            let bytes = Vec::from(bytes);
            let bytes = bytes.as_slice();
            match futures::ready!(Pin::new(&mut self.inner).poll_write(cx, bytes)) {
                Ok(n) => {
                    self.bytes = self.bytes.split_off(n);
                }
                Err(e) => return Poll::Ready(Err(e)),
            }
        }
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        bufs: &[IoSlice<'_>],
    ) -> Poll<IoResult<usize>> {
        todo!()
    }

    fn is_write_vectored(&self) -> bool {
        false
    }
}

pub struct BufWriter {
    buf: Vec<u8>,
}

impl BufWriter {
    pub fn new() -> Self {
        BufWriter { buf: Vec::new() }
    }

    pub fn read_buf(self) -> Vec<u8> {
        self.buf
    }
}

impl AsyncWrite for BufWriter {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<IoResult<usize>> {
        self.buf.put_slice(buf);
        Poll::Ready(Ok(buf.len()))
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Poll::Ready(Ok(()))
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        bufs: &[IoSlice<'_>],
    ) -> Poll<IoResult<usize>> {
        todo!()
    }

    fn is_write_vectored(&self) -> bool {
        false
    }
}

pub struct HashWriter<W: AsyncWrite + Sync + Unpin> {
    inner: W,
    hasher: Box<Sha256>,
    buf: Vec<u8>,
}

impl<W: AsyncWrite + Sync + Unpin> HashWriter<W> {
    pub fn into_inner(self) -> W {
        self.inner
    }

    pub fn new(writer: W) -> Self {
        HashWriter {
            hasher: Box::new(Sha256::new()),
            inner: writer,
            buf: vec![],
        }
    }

    pub fn digest_finalize(&mut self) -> RafsDigest {
        self.hasher.digest_finalize()
    }

    pub fn to_string(&self) -> String {
        String::from(std::str::from_utf8(&*self.buf).unwrap())
    }
}

impl<W: AsyncWrite + Sync + Unpin> AsyncWrite for HashWriter<W> {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<IoResult<usize>> {
        match futures::ready!(Pin::new(&mut self.inner).poll_write(cx, buf)) {
            Ok(size) => {
                self.hasher.digest_update(&buf[0..size]);
                self.buf.extend_from_slice(buf);
                Poll::Ready(Ok(size))
            }
            Err(e) => Poll::Ready(Err(e)),
        }
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        bufs: &[IoSlice<'_>],
    ) -> Poll<IoResult<usize>> {
        match futures::ready!(Pin::new(&mut self.inner).poll_write_vectored(cx, bufs)) {
            Ok(size) => {
                let mut bytes = BytesMut::new();
                for buf in bufs {
                    bytes.put_slice(buf);
                    self.buf.extend_from_slice(buf);
                }
                self.hasher.digest_update(&bytes[0..size]);
                Poll::Ready(Ok(size))
            }
            Err(e) => Poll::Ready(Err(e)),
        }
    }

    fn is_write_vectored(&self) -> bool {
        self.inner.is_write_vectored()
    }
}

pub struct CountWriter<W: AsyncWrite + Sync + Unpin> {
    written_bytes: usize,
    inner: W,
}

impl<W: AsyncWrite + Sync + Unpin> CountWriter<W> {
    pub fn into_inner(self) -> W {
        self.inner
    }

    pub fn new(writer: W) -> Self {
        CountWriter {
            inner: writer,
            written_bytes: 0,
        }
    }

    pub fn get_written_bytes(&self) -> usize {
        self.written_bytes
    }
}

impl<W: AsyncWrite + Sync + Unpin> AsyncWrite for CountWriter<W> {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<IoResult<usize>> {
        match futures::ready!(Pin::new(&mut self.inner).poll_write(cx, buf)) {
            Ok(size) => {
                self.written_bytes += size;
                Poll::Ready(Ok(size))
            }
            Err(e) => Poll::Ready(Err(e)),
        }
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        bufs: &[IoSlice<'_>],
    ) -> Poll<IoResult<usize>> {
        match futures::ready!(Pin::new(&mut self.inner).poll_write_vectored(cx, bufs)) {
            Ok(size) => {
                self.written_bytes += size;
                Poll::Ready(Ok(size))
            }
            Err(e) => Poll::Ready(Err(e)),
        }
    }

    fn is_write_vectored(&self) -> bool {
        self.inner.is_write_vectored()
    }
}

/// 丢弃最后 drop_size 内容
/// 在 tar 拼接时, 每个 tar 最后有 1024 空白内容
/// 所以需要丢弃
pub struct DropLastWrite<W: AsyncWrite + Unpin + Send + Sync> {
    inner: W,
    buf: Vec<u8>,
    drop_size: usize,
}

impl<W: AsyncWrite + Unpin + Send + Sync> DropLastWrite<W> {
    pub fn new(w: W, drop_size: usize) -> Self {
        DropLastWrite {
            inner: w,
            drop_size,
            buf: Vec::with_capacity(drop_size),
        }
    }
}

impl<W: AsyncWrite + Unpin + Send + Sync> AsyncWrite for DropLastWrite<W> {
    fn poll_write(self: Pin<&mut Self>, cx: &mut Context<'_>, buf: &[u8]) -> Poll<IoResult<usize>> {
        if buf.is_empty() {
            return Poll::Ready(Ok(0));
        }
        let size = buf.len();
        let already_buf_size = self.buf.len();
        let can_buf_size = self.drop_size - already_buf_size;
        let mut_self = self.get_mut();
        // 不超过 buf 缓存起来
        if can_buf_size > size {
            mut_self.buf.extend_from_slice(buf);
            return Poll::Ready(Ok(size));
        }
        let real_write_size = size - can_buf_size;
        let write_buf = if real_write_size > already_buf_size {
            // 遇到超大 buf 需要直接将新来的 buf 一部分直接写到 inner
            // 1. 排空整个缓冲区，并写入
            // 2. 将 buf 超过缓存区的部分写入
            // 3. 将 buf 剩余部分缓冲
            let mut write_buf = Vec::with_capacity(real_write_size);
            write_buf.extend_from_slice(&mut_self.buf.drain(0..).collect::<Vec<u8>>());
            let direct_write_size = real_write_size - already_buf_size;

            write_buf.extend_from_slice(&buf[0..direct_write_size]);
            mut_self.buf.extend_from_slice(&buf[direct_write_size..]);
            write_buf
        } else {
            // 1.将缓冲区头部写入
            // 2.buf 写入缓冲区
            let write_buf: Vec<u8> = mut_self.buf.drain(0..real_write_size).collect();
            mut_self.buf.extend_from_slice(buf);
            write_buf
        };
        let write_res = Pin::new(&mut (mut_self.inner)).poll_write(cx, &write_buf);

        match write_res {
            Poll::Ready(res) => match res {
                Ok(write_succeed_size) => {
                    if write_succeed_size > size {
                        Poll::Ready(Ok(size))
                    } else {
                        Poll::Ready(Ok(write_succeed_size + can_buf_size))
                    }
                }
                Err(e) => Poll::Ready(Err(e)),
            },
            Poll::Pending => Poll::Pending,
        }
    }

    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        let flush_res = Pin::new(&mut self.get_mut().inner).poll_flush(cx);
        flush_res
    }

    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        let shutdown_res = Pin::new(&mut self.get_mut().inner).poll_shutdown(cx);
        shutdown_res
    }
}

pub struct BadBufWriter {
    buf: Vec<u8>,
    write_count: u64,
}

impl BadBufWriter {
    pub fn new() -> Self {
        BadBufWriter {
            buf: Vec::new(),
            write_count: 0,
        }
    }

    pub fn read_buf(self) -> Vec<u8> {
        self.buf
    }
}

impl AsyncWrite for BadBufWriter {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<IoResult<usize>> {
        let count = self.write_count;
        self.write_count += 1;
        if count % 2 == 0 {
            let waker = cx.waker().clone();
            std::thread::spawn(|| {
                std::thread::sleep(Duration::from_millis(10));
                waker.wake();
            });
            Poll::Pending
        } else {
            let len = min(buf.len(), 100);
            self.buf.put_slice(&buf[0..len]);
            Poll::Ready(Ok(len))
        }
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Poll::Ready(Ok(()))
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        bufs: &[IoSlice<'_>],
    ) -> Poll<IoResult<usize>> {
        todo!()
    }

    fn is_write_vectored(&self) -> bool {
        false
    }
}

#[cfg(test)]
mod test {
    use crate::util::{BadBufWriter, BlackHole, BufWriter, MultiWriter};
    use tokio::fs::OpenOptions;

    #[tokio::test]
    async fn test_multi_writer() {
        let mut bucket_file = OpenOptions::new()
            .create(false)
            .write(false)
            .read(true)
            .open("./test/fixtures/tar/egg-2.29.1.tgz")
            .await
            .unwrap();
        let buf_writer = BufWriter::new();
        let bad_buf_writer = BadBufWriter::new();
        let mut multi_writer = MultiWriter::new(buf_writer, bad_buf_writer);
        tokio::io::copy(&mut bucket_file, &mut multi_writer)
            .await
            .unwrap();
        let (buf_writer, bad_buf_writer) = multi_writer.into_inner();

        let buf = buf_writer.read_buf();
        let bad_buf = bad_buf_writer.read_buf();
        assert_eq!(buf.len(), 87125);
        assert_eq!(bad_buf.len(), 87125);
    }
}
