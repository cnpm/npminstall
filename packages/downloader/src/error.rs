use crate::PackageRequest;
use nix::errno::Errno;
use reqwest::Error as ReqwestError;
use std::fmt;
use std::io::Error as IoError;
use std::result::Result as StdResult;
use tokio::sync::mpsc::error::SendError;
use tokio::task::JoinError;
use tokio::time::error::Elapsed;

#[derive(Debug)]
pub enum Error {
    IoError(IoError),
    NixError(Errno),
    FormatError(String),
    JoinError(JoinError),
    // FIXME 修复 senderror 的范型
    SendError(String),
    ReqwestError(ReqwestError),
    ArcBusy(String),
    BatchDownloadError(Option<Vec<PackageRequest>>),
    Timeout(Elapsed),
}

pub type Result<T> = StdResult<T, Error>;

impl From<IoError> for Error {
    fn from(e: IoError) -> Self {
        Error::IoError(e)
    }
}

impl From<Errno> for Error {
    fn from(e: Errno) -> Self {
        Error::NixError(e)
    }
}

impl From<JoinError> for Error {
    fn from(e: JoinError) -> Self {
        Error::JoinError(e)
    }
}

impl<T> From<SendError<T>> for Error {
    fn from(_: SendError<T>) -> Self {
        Error::SendError(String::from("send error"))
    }
}

impl From<ReqwestError> for Error {
    fn from(e: ReqwestError) -> Self {
        Error::ReqwestError(e)
    }
}

impl From<Elapsed> for Error {
    fn from(e: Elapsed) -> Self {
        Error::Timeout(e)
    }
}

impl fmt::Display for Error {
    fn fmt(&self, fmt: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::IoError(e) => e.fmt(fmt),
            Error::NixError(e) => e.fmt(fmt),
            Error::FormatError(msg) => {
                write!(fmt, "FormatError: {}", msg)
            }
            Error::JoinError(e) => e.fmt(fmt),
            Error::SendError(e) => e.fmt(fmt),
            Error::ReqwestError(e) => e.fmt(fmt),
            Error::ArcBusy(msg) => {
                write!(fmt, "ArcBusy: {}", msg)
            }
            Error::BatchDownloadError(e) => match e {
                None => write!(fmt, "all task failed"),
                Some(failed_list) => write!(fmt, "download {:?} failed", failed_list),
            },
            Error::Timeout(e) => e.fmt(fmt),
        }
    }
}
