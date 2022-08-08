use anyhow::{Context, Result};
use serde::Deserialize;
use serde_json::value::Value;
use std::fs::File;

// storage backend config
#[derive(Default, Clone, Deserialize)]
pub struct Config {
    pub backend: BackendConfig,
    #[serde(default)]
    pub cache: CacheConfig,
}

#[derive(Default, Clone, Deserialize)]
pub struct BackendConfig {
    #[serde(rename = "type")]
    pub backend_type: String,
    #[serde(rename = "config")]
    pub backend_config: Value,
}

impl BackendConfig {
    pub fn from_str(backend_type: &str, json_str: &str) -> Result<BackendConfig> {
        let backend_config = serde_json::from_str(json_str)
            .context("failed to parse backend config in JSON string")?;
        Ok(Self {
            backend_type: backend_type.to_string(),
            backend_config,
        })
    }
    pub fn from_file(backend_type: &str, file_path: &str) -> Result<BackendConfig> {
        let file = File::open(file_path)
            .with_context(|| format!("failed to open backend config file {}", file_path))?;
        let backend_config = serde_json::from_reader(file)
            .with_context(|| format!("failed to parse backend config file {}", file_path))?;
        Ok(Self {
            backend_type: backend_type.to_string(),
            backend_config,
        })
    }
}

#[derive(Default, Clone, Deserialize)]
pub struct CacheConfig {
    #[serde(default, rename = "validate")]
    pub cache_validate: bool,
    #[serde(default, rename = "compressed")]
    pub cache_compressed: bool,
    #[serde(default, rename = "type")]
    pub cache_type: String,
    #[serde(default, rename = "config")]
    pub cache_config: Value,
    #[serde(skip_serializing, skip_deserializing)]
    pub prefetch_worker: PrefetchWorker,
}

#[derive(Clone, Default)]
pub struct PrefetchWorker {
    pub enable: bool,
    pub threads_count: usize,
    pub merging_size: usize,
    // In unit of Bytes and Zero means no rate limit is set.
    pub bandwidth_rate: u32,
}
