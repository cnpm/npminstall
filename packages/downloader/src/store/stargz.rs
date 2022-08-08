// Copy from image-service
// Copyright 2020 Alibaba cloud. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
// Stargz support.

use serde::{Deserialize, Serialize};

use std::collections::HashMap;

use std::path::PathBuf;

// use rafs::metadata::digest::{Algorithm, RafsDigest};

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct TocEntry {
    // Name is the tar entry's name. It is the complete path
    // stored in the tar file, not just the base name.
    pub name: PathBuf,

    // Type is one of "dir", "reg", "symlink", "hardlink", "char",
    // "block", "fifo", or "chunk".
    // The "chunk" type is used for regular file data chunks past the first
    // TOCEntry; the 2nd chunk and on have only Type ("chunk"), Offset,
    // ChunkOffset, and ChunkSize populated.
    #[serde(rename = "type")]
    pub toc_type: String,

    // Size, for regular files, is the logical size of the file.
    #[serde(default)]
    pub size: u64,

    // LinkName, for symlinks and hardlinks, is the link target.
    #[serde(default, rename = "linkName")]
    pub link_name: PathBuf,

    // Mode is the permission and mode bits.
    #[serde(default)]
    pub mode: u32,

    // Uid is the user ID of the owner.
    #[serde(default)]
    pub uid: u32,

    // Gid is the group ID of the owner.
    #[serde(default)]
    pub gid: u32,

    // Uname is the username of the owner.
    //
    // In the serialized JSON, this field may only be present for
    // the first entry with the same Uid.
    #[serde(default, rename = "userName")]
    pub uname: String,

    // Gname is the group name of the owner.
    //
    // In the serialized JSON, this field may only be present for
    // the first entry with the same Gid.
    #[serde(default, rename = "groupName")]
    pub gname: String,

    // Offset, for regular files, provides the offset in the
    // stargz file to the file's data bytes. See ChunkOffset and
    // ChunkSize.
    #[serde(default)]
    pub offset: u64,

    // DevMajor is the major device number for "char" and "block" types.
    #[serde(default, rename = "devMajor")]
    pub dev_major: u64,

    // DevMinor is the major device number for "char" and "block" types.
    #[serde(default, rename = "devMinor")]
    pub dev_minor: u64,

    // Xattrs are the extended attribute for the entry.
    #[serde(default)]
    pub xattrs: HashMap<String, String>,

    // Digest stores the OCI checksum for regular files payload.
    // It has the form "sha256:abcdef01234....".
    #[serde(default)]
    pub digest: String,

    // ChunkOffset is non-zero if this is a chunk of a large,
    // regular file. If so, the Offset is where the gzip header of
    // ChunkSize bytes at ChunkOffset in Name begin.
    //
    // In serialized form, a "chunkSize" JSON field of zero means
    // that the chunk goes to the end of the file. After reading
    // from the stargz TOC, though, the ChunkSize is initialized
    // to a non-zero file for when Type is either "reg" or
    // "chunk".
    #[serde(default, rename = "chunkOffset")]
    pub chunk_offset: u64,
    #[serde(default, rename = "chunkSize")]
    pub chunk_size: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TocIndex {
    pub version: u32,
    pub entries: Vec<TocEntry>,
}

impl TocIndex {
    pub fn new() -> Self {
        TocIndex {
            version: 1,
            entries: Vec::new(),
        }
    }
}
