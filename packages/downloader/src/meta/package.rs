use crate::error::{Error, Result};
use crate::pool::Command;

#[derive(Debug, Clone)]
pub struct PackageRequest {
    pub name: String,
    pub version: String,
    pub sha: String,
    pub url: String,
}

pub struct PackageRequestBuilder {
    name: Option<String>,
    version: Option<String>,
    sha: Option<String>,
    url: Option<String>,
}

impl PackageRequestBuilder {
    /// # Example
    /// ```
    /// use downloader::meta::{PackageRequestBuilder, PackageRequest};
    /// let pkg: PackageRequest = PackageRequestBuilder::new()
    /// .name("foo")
    /// .version("1.0.0")
    /// .sha("mock_sha1")
    /// .url("mock_url")
    /// .build()
    /// .unwrap();
    /// ```
    pub fn new() -> Self {
        PackageRequestBuilder {
            name: None,
            version: None,
            sha: None,
            url: None,
        }
    }

    pub fn name(mut self, name: &str) -> Self {
        self.name = Some(String::from(name));
        self
    }

    pub fn version(mut self, version: &str) -> Self {
        self.version = Some(String::from(version));
        self
    }

    pub fn sha(mut self, sha: &str) -> Self {
        self.sha = Some(String::from(sha));
        self
    }

    pub fn url(mut self, url: &str) -> Self {
        self.url = Some(String::from(url));
        self
    }

    pub fn build(self) -> Result<PackageRequest> {
        let PackageRequestBuilder {
            name,
            version,
            sha,
            url,
        } = self;
        let name = name.ok_or_else(|| Error::FormatError("package has no name".to_string()))?;
        let version =
            version.ok_or_else(|| Error::FormatError("package has no version".to_string()))?;
        let sha = sha.ok_or_else(|| Error::FormatError("package has no sha".to_string()))?;
        let url = url.ok_or_else(|| Error::FormatError("package has no url".to_string()))?;

        Ok(PackageRequest {
            name,
            version,
            sha,
            url,
        })
    }
}

impl PackageRequest {
    /// get tar prefix for package, and if package has scope
    /// replace / with _
    ///
    /// # Examples
    /// Basic usage:
    /// ```
    /// use downloader::meta::{PackageRequestBuilder, PackageRequest};
    ///
    ///  let pkg = PackageRequestBuilder::new()
    /// .name("foo")
    /// .version("1.0.0")
    /// .sha("mock")
    /// .url("mock_url")
    /// .build()
    /// .unwrap();
    ///
    ///  let prefix = pkg.tar_prefix();
    /// assert_eq!(prefix, String::from("foo@1.0.0"));
    /// ```
    ///
    /// Scope usage:
    /// ```
    /// use downloader::meta::{PackageRequestBuilder, PackageRequest};
    ///
    ///  let pkg = PackageRequestBuilder::new()
    /// .name("@mockscope/foo")
    /// .version("1.0.0")
    /// .sha("mock")
    /// .url("mock_url")
    /// .build()
    /// .unwrap();
    ///
    ///  let prefix = pkg.tar_prefix();
    /// assert_eq!(prefix, String::from("@mockscope/foo@1.0.0"));
    /// ```
    ///
    pub fn tar_prefix(&self) -> String {
        let id = format!("{}@{}", self.name, self.version);

        id.replace("/", "_")
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn version(&self) -> &str {
        &self.version
    }

    pub fn sha(&self) -> &str {
        &self.sha
    }

    pub fn url(&self) -> &str {
        &self.url
    }
}
