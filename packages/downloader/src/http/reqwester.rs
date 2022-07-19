use crate::download::DownloadResponse;
use crate::error::{Error, Result as TnpmResult};
use crate::meta::PackageRequest;
use bytes::Bytes;
use futures::Stream;
use futures_util::TryStreamExt;
use log::{info, warn};
use rand::prelude::IteratorRandom;
use reqwest::StatusCode;
use std::io::{Error as IoError, ErrorKind as IoErrorKind};
use std::net::ToSocketAddrs;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc::Sender;
use tokio_util::io::StreamReader;

pub type EntryStream = dyn Stream<Item = Result<Bytes, IoError>> + Send + Sync + Unpin;
pub type ResponseStreamReader = StreamReader<Box<EntryStream>, Bytes>;

pub struct HTTPReqwester {
    client: Arc<reqwest::Client>,
}

impl HTTPReqwester {
    pub fn new() -> TnpmResult<Self> {
        let client_builder = reqwest::ClientBuilder::new()
            .tcp_keepalive(Duration::from_secs(60))
            .connection_verbose(true)
            .redirect(reqwest::redirect::Policy::limited(10))
            .http1_only()
            .use_rustls_tls();

        let client_builder = HTTPReqwester::prepare_dns_resolve(client_builder)?;
        let client = client_builder.build()?;
        Ok(HTTPReqwester {
            client: Arc::new(client),
        })
    }

    pub fn new_with_client(client: Arc<reqwest::Client>) -> Self {
        HTTPReqwester { client }
    }

    pub(crate) fn prepare_dns_resolve(
        mut client_builder: reqwest::ClientBuilder,
    ) -> Result<reqwest::ClientBuilder, IoError> {
        // 在大量连接建立时，容易发生 DNS 超时
        let pre_resolve_list = vec![
            "registry.npmmirror.com",
        ];
        let mut client_builder = client_builder;
        for address in pre_resolve_list {
            let address_with_port = format!("{}:443", address);
            let socket_addr = address_with_port.to_socket_addrs()?;
            let socket_addr = socket_addr.choose(&mut rand::thread_rng()).ok_or_else(|| {
                IoError::new(
                    IoErrorKind::Other,
                    format!("not found address for {}", address),
                )
            })?;
            client_builder = client_builder.resolve(address, socket_addr);
        }
        Ok(client_builder)
    }

    pub async fn request(&self, pkg_request: PackageRequest) -> Result<DownloadResponse, IoError> {
        info!("start request {}", pkg_request.url());
        let res = self
            .client
            .get(pkg_request.url())
            .send()
            .await
            .map_err(|e| IoError::new(IoErrorKind::BrokenPipe, e))?;
        if res.status() != StatusCode::OK {
            warn!(
                "end request {} status code {}",
                pkg_request.url(),
                res.status()
            );
            return Err(IoError::new(
                IoErrorKind::Other,
                format!("request {} failed: {}", pkg_request.url(), res.status()),
            ));
        }
        info!("end request {}", pkg_request.url());
        let stream = res
            .bytes_stream()
            .map_err(|e| IoError::new(IoErrorKind::BrokenPipe, e));
        let response = DownloadResponse {
            reader: StreamReader::new(Box::new(stream)),
            pkg_request,
        };
        Ok(response)
    }
}

#[cfg(test)]
mod test {
    use crate::http::HTTPReqwester;
    use crate::meta::PackageRequestBuilder;
    use tokio::io::AsyncReadExt;

    #[tokio::test]
    async fn test_download() {
        let req = HTTPReqwester::new().unwrap();
        let stream = req
            .request(
                PackageRequestBuilder::new()
                    .name("mock-pkg")
                    .version("1.0.0")
                    .url("http://127.0.0.1:8888/a-sync-waterfall-1.0.1.tgz")
                    .sha("mock_sha")
                    .build()
                    .unwrap(),
            )
            .await;
        assert!(stream.is_ok());
        let mut res: Vec<u8> = vec![];
        let read_res = stream.unwrap().reader.read_to_end(&mut res).await;
        assert!(read_res.is_ok());
        assert!(read_res.unwrap() > 0);
    }
}
