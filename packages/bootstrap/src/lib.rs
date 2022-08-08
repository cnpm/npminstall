// Copyright 2020 Ant Group. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

extern crate clap;
#[macro_use]
extern crate log;
extern crate serde;
#[macro_use]
extern crate lazy_static;

pub mod bootstrap;
pub mod builder;
pub mod node;
pub mod stargz;
pub mod trace;
pub mod tree;
pub mod validator;

use anyhow::{bail, Context, Result};

use std::collections::BTreeMap;
use std::fs::OpenOptions;
use std::io;
use std::path::{Path, PathBuf};

// use nix::unistd::{getegid, geteuid};
use serde::Serialize;
use std::borrow::Cow;

use crate::bootstrap::BlobIdTocIndex;
use crate::builder::{Builder, PrefetchPolicy};
use crate::stargz::TocIndex;
use crate::tree::Tree;
use builder::SourceType;
use node::WhiteoutSpec;
use rafs::metadata::digest;
use rafs::storage::compress;
use trace::*;
use validator::Validator;

#[derive(Serialize, Default)]
pub struct ResultOutput {
    blobs: Vec<String>,
    trace: serde_json::Map<String, serde_json::Value>,
}

impl ResultOutput {
    fn dump<W>(&self, writer: W) -> Result<()>
    where
        W: io::Write,
    {
        serde_json::to_writer(writer, &self).context("Write output file failed")
    }
}

fn dump_result_output(blob_ids: Vec<String>) -> Result<()> {
    let output_json = Path::new("/home/admin/workdir/output.json");

    let w = OpenOptions::new()
        .truncate(true)
        .create(true)
        .write(true)
        .open(output_json)
        .with_context(|| format!("{:?} can't be opened", output_json))?;

    let trace = root_tracer!().dump_summary_map().unwrap_or_default();

    ResultOutput {
        trace,
        blobs: blob_ids,
    }
    .dump(w)?;

    Ok(())
}

/// Gather readahead file paths line by line from stdin
/// Input format:
///    printf "/relative/path/to/rootfs/1\n/relative/path/to/rootfs/1"
/// This routine does not guarantee that specified file must exist in local filesystem,
/// this is because we can't guarantee that source rootfs directory of parent bootstrap
/// is located in local file system.
fn gather_readahead_files() -> Result<BTreeMap<PathBuf, Option<u64>>> {
    let stdin = io::stdin();
    let mut files = BTreeMap::new();

    loop {
        let mut file = String::new();

        let size = stdin
            .read_line(&mut file)
            .context("failed to parse readahead files")?;
        if size == 0 {
            break;
        }
        let file_trimmed: PathBuf = file.trim().into();
        // Sanity check for the list format.
        if !file_trimmed.starts_with(Path::new("/")) {
            warn!(
                "Illegal file path specified. It {:?} must start with '/'",
                file
            );
            continue;
        }

        debug!(
            "readahead file: {}, trimmed file name {:?}",
            file, file_trimmed
        );
        // The inode index is not decided yet, but will do during fs-walk.
        files.insert(file_trimmed, None);
    }

    Ok(files)
}
pub fn create(
    source_json: Cow<BlobIdTocIndex>,
    source_type: SourceType,
    blob_id: String,
    bootstrap_path: &Path,
    blob_path: Option<&Path>,
    prefetch_policy: PrefetchPolicy,
    whiteout_spec: WhiteoutSpec,
) -> Result<Builder> {
    if source_type == SourceType::Directory {
        bail!("only work in SourceType::StargzIndex mode, which now is SourceType::Directory");
    }

    if blob_id.is_empty() {
        bail!("blob-id can't be empty");
    }
    let compressor = compress::Algorithm::GZip;
    let digester = digest::Algorithm::Sha256;
    let repeatable = false;
    let aligned_chunk = false;

    let blob_path = match blob_path {
        Some(p) => Some(p),
        None => None,
    };

    let hint_readahead_files = if prefetch_policy != builder::PrefetchPolicy::None {
        gather_readahead_files().context("failed to get readahead files")?
    } else {
        BTreeMap::new()
    };

    let mut ib = builder::Builder::new(
        source_type,
        source_json.into_owned(),
        blob_path,
        bootstrap_path,
        blob_id,
        compressor,
        digester,
        hint_readahead_files,
        prefetch_policy,
        !repeatable,
        whiteout_spec,
        aligned_chunk,
    )?;

    ib.build().unwrap();

    Ok(ib)
}

pub fn check(bootstrap_path: &Path) -> Result<()> {
    let mut validator = Validator::new(bootstrap_path)?;
    let blob_ids = validator
        .check(true)
        .with_context(|| format!("failed to check bootstrap {:?}", bootstrap_path))?;

    info!("bootstrap is valid, blobs: {:?}", blob_ids);
    dump_result_output(blob_ids);
    Ok(())
}
