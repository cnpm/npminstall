// use std::str::FromStr;
use std::sync::Arc;

// use nydus_utils::einval;
use crate::metadata::RafsChunkInfo;
pub mod compress;
pub mod factory;
pub mod utils;

/// Rafs blob IO info
#[derive(Clone)]
pub struct RafsBio {
    /// reference to the chunk
    pub chunkinfo: Arc<dyn RafsChunkInfo>,
    /// blob id of chunk
    pub blob_id: String,
    /// offset within the chunk
    pub offset: u32,
    /// size within the chunk
    pub size: usize,
    /// block size to read in one shot
    pub blksize: u32,
}

impl RafsBio {
    pub fn new(
        chunkinfo: Arc<dyn RafsChunkInfo>,
        blob_id: String,
        offset: u32,
        size: usize,
        blksize: u32,
    ) -> Self {
        RafsBio {
            chunkinfo,
            blob_id,
            offset,
            size,
            blksize,
        }
    }
}

#[derive(Default)]
pub struct RafsBioDesc {
    // Blob IO flags
    pub bi_flags: u32,
    // Total IO size to be performed
    pub bi_size: usize,
    // Array of blob IO info. Corresponding data should be read from/write to IO stream sequentially
    pub bi_vec: Vec<RafsBio>,
}

impl RafsBioDesc {
    pub fn new() -> Self {
        RafsBioDesc {
            ..Default::default()
        }
    }
}
