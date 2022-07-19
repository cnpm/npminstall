extern crate flate2;
extern crate serde;
extern crate serde_json;
extern crate sha2;
extern crate tar;
use serde::{Deserialize, Serialize};

use crate::node::{Node, Overlay, WhiteoutSpec, WhiteoutType, OVERLAYFS_WHITEOUT_OPAQUE};
use crate::stargz;
use crate::stargz::{TocEntry, DEFAULT_BLOCK_SIZE};
use crate::tree::Tree;
use anyhow::{Context, Result};
use flate2::bufread::GzDecoder;
use rafs::metadata::digest::{self, RafsDigest};
use rafs::metadata::layout::{
    OndiskBlobTable, OndiskChunkInfo, OndiskInodeTable, OndiskSuperBlock, RAFS_ROOT_INODE,
};
use rafs::metadata::{Inode, RafsStore};
use rafs::storage::compress;
use rafs::RafsIoWrite;
use serde_json::Result as SerdeJSONResult;
use std::collections::HashMap;
use std::ffi::OsString;
#[allow(unused)]
use std::fs::{self, File, OpenOptions, ReadDir};
use std::io::prelude::*;
use std::io::{BufReader, BufWriter, Read, SeekFrom};
use std::mem::size_of;
use std::os::unix::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::str;
use std::u64;
use tar::Archive;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TocIndex {
    pub blobId: String,
    pub entry: TocEntry,
}

pub type BlobIdTocIndex = Vec<TocIndex>;
pub type BlobIds = Vec<String>;
type VecBlobIdTocIndex = Vec<(String, TocIndex)>;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct BlobIdsTocIndexes {
    pub blobIds: BlobIds,
    pub entries: BlobIdTocIndex,
}

const BUF_WRITER_CAPACITY: usize = 2 << 17;
const SUPER_BLOCK_SIZE: usize = size_of::<OndiskSuperBlock>();

pub struct Bootstrap {
    // super block, size: 8KB
    super_block: OndiskSuperBlock,
    // Cache node index for hardlinks, HashMap<Inode, Vec<index>>.
    // for npm stargz, all files could be treated as upper files
    inode_map: HashMap<(Inode, u64), Vec<u64>>,
    // Store all blob id entry during build.
    blob_table: OndiskBlobTable,
    // Store all nodes during build, node index of root starting from 1,
    // so the collection index equal to (node.index - 1).
    nodes: Vec<Node>,
    // Store all chunk digest for chunk deduplicate during build.
    // Bootstrap file writer.
    writer: Box<dyn RafsIoWrite>,
    // we dont use Tree::apply here, so real_ino should manually count and set back to node.
    // linux filesystem ino start at 1.
    node_path_map: HashMap<PathBuf, u64>,
    // every blob contains multiple npm package, we need store eveny path to its blob_id
    // so rafs will find the specific blob when reading.
    node_path_blob_id_map: HashMap<PathBuf, u32>,
}

impl Bootstrap {
    pub fn build(&mut self, toc_indexes: BlobIdTocIndex, blob_ids: BlobIds) -> &mut Self {
        self.build_tree(toc_indexes, blob_ids);
        self.build_super_block();
        self
    }

    // dump to bootstrap file
    pub fn dump(&mut self) -> Result<()> {
        self.super_block.store(&mut self.writer);

        let mut inode_table = OndiskInodeTable::new(self.nodes.len() as usize);
        let inode_table_size = inode_table.size();
        let blob_table_size = self.blob_table.size();
        let mut inode_offset = (SUPER_BLOCK_SIZE + inode_table_size + blob_table_size) as u32;

        for node in &mut self.nodes {
            inode_table.set(node.index, inode_offset)?;
            // Add inode size
            inode_offset += node.inode.size() as u32;
            // Add chunks size
            if node.is_reg() {
                inode_offset +=
                    (node.inode.i_child_count as usize * size_of::<OndiskChunkInfo>()) as u32;
            }
        }

        inode_table.store(&mut self.writer);

        self.blob_table.store(&mut self.writer);

        for node in &mut self.nodes {
            node.dump_bootstrap(&mut self.writer);
        }

        self.writer.flush()?;
        Ok(())
    }

    fn build_tree(&mut self, toc_indexes: BlobIdTocIndex, blob_ids: BlobIds) -> Result<()> {
        let mut tree = Tree::new(
            Node::new(
                PathBuf::from("/"),
                PathBuf::from("/"),
                Overlay::UpperAddition,
                true,
            )
            .unwrap(),
        );

        let mut blob_id_map: HashMap<String, u32> = HashMap::new();
        let mut index: u32 = 0;

        for blob_id in blob_ids.iter() {
            self.blob_table.add(blob_id.clone(), 0, 0u32);
            blob_id_map.insert(blob_id.clone(), index);
            index += 1;
        }

        tree.update_from_stargz_index(&toc_indexes);
        for toc_index in toc_indexes {
            let blob_id = toc_index.blobId;
            let name = toc_index.entry.name;
            self.node_path_blob_id_map
                .insert(name, *blob_id_map.get(&blob_id).unwrap());
        }

        debug!("latest tree.children: {:?}", tree.children);
        self.build_rafs_wrap(&mut tree);
        self.build_node_blob_index();
        Ok(())
    }

    fn build_super_block(&mut self) {
        let inode_table_entries = self.nodes.len() as u32;
        let inode_table = OndiskInodeTable::new(inode_table_entries as usize);
        let inode_table_size = inode_table.size();
        let blob_table_size = self.blob_table.size();
        let prefetch_table_offset = SUPER_BLOCK_SIZE + inode_table_size;

        let inodes_count = self.inode_map.len() as u64;
        self.super_block.set_inodes_count(inodes_count);
        self.super_block
            .set_inode_table_entries(inode_table_entries);
        self.super_block.set_blob_table_size(blob_table_size as u32);
        self.super_block
            .set_prefetch_table_offset(prefetch_table_offset as u64);
        self.super_block
            .set_blob_table_offset(prefetch_table_offset as u64);
        // no need to customize
        self.super_block
            .set_inode_table_offset(SUPER_BLOCK_SIZE as u64);
        self.super_block.set_compressor(compress::Algorithm::None);
        self.super_block.set_digester(digest::Algorithm::Sha256);
        self.super_block.set_explicit_uidgid();
        self.super_block.set_block_size(stargz::DEFAULT_BLOCK_SIZE);
        self.super_block.set_prefetch_table_entries(0u32);
    }

    fn build_node_blob_index(&mut self) {
        for node in &mut self.nodes {
            // every node should only have one blob file, so chunks' use this blob_index to locate stargz file.
            let node_path = &node.path;
            let node_path = if node_path.starts_with("/") {
                node_path.strip_prefix("/").unwrap().to_path_buf()
            } else {
                node_path.clone()
            };
            for chunk in node.chunks.iter_mut() {
                (*chunk).blob_index = self
                    .node_path_blob_id_map
                    .get::<PathBuf>(&node_path)
                    .map_or_else(|| 0, |idx| *idx);
            }
        }
    }

    fn update_node_path_map(&mut self, path: PathBuf) -> u64 {
        if self.node_path_map.contains_key(&path) {
            *self.node_path_map.get(&path).unwrap()
        } else {
            self.node_path_map
                .insert(path, (self.node_path_map.len() + 1) as u64);
            self.node_path_map.len() as u64
        }
    }

    fn build_rafs_wrap(&mut self, mut tree: &mut Tree) {
        let index = RAFS_ROOT_INODE;
        tree.node.index = index;
        tree.node.inode.i_ino = index;
        tree.node.real_ino = index;

        self.update_node_path_map((&tree.node).path.to_owned());

        let mut nodes = vec![tree.node.clone()];
        debug!("build_rafs_wrap tree.children: {:?}", tree.children);
        self.build_rafs(&mut tree, &mut nodes);
        self.nodes = nodes;
    }

    fn build_rafs(&mut self, tree: &mut Tree, nodes: &mut Vec<Node>) {
        // FIX: Insert parent inode to inode map to keep correct inodes count in superblock.
        self.inode_map
            .insert((tree.node.real_ino, tree.node.dev), vec![tree.node.index]);

        let index = nodes.len() as u64;
        let parent = &mut nodes[tree.node.index as usize - 1];

        if parent.is_dir() {
            parent.inode.i_child_index = index as u32 + 1;
            parent.inode.i_child_count = tree.children.len() as u32;
        }

        let parent_ino = parent.inode.i_ino;

        // Cache dir tree for BFS walk
        let mut dirs: Vec<&mut Tree> = Vec::new();

        // Sort children list by name,
        // so that we can improve performance in fs read_dir using binary search.
        tree.children
            .sort_by_key(|child| child.node.name().to_os_string());

        for child in tree.children.iter_mut() {
            let index = nodes.len() as u64 + 1;
            child.node.index = index;
            child.node.inode.i_parent = parent_ino;
            child.node.real_ino = self.update_node_path_map(child.clone().node.path);

            // Hardlink handle, all hardlink nodes' ino, nlink should be the same,
            // because the real_ino may be conflicted between different layers,
            // so we need to find hardlink node index list in the layer where the node is located.
            if let Some(indexes) = self
                .inode_map
                .get_mut(&(child.node.real_ino, child.node.dev))
            {
                indexes.push(index);
                let first_index = indexes.first().unwrap();
                let nlink = indexes.len() as u32;
                child.node.inode.i_ino = *first_index;
                child.node.inode.i_nlink = nlink;
                // Update nlink for previous hardlink inodes
                for idx in indexes {
                    if index == *idx {
                        continue;
                    }
                    nodes[*idx as usize - 1].inode.i_nlink = nlink;
                }
            } else {
                child.node.inode.i_ino = index;
                child.node.inode.i_nlink = 1;
                // Store inode real ino
                self.inode_map.insert(
                    (child.node.real_ino, child.node.dev),
                    vec![child.node.index],
                );
            }

            if child.node.is_reg()
                && child.node.inode.i_size > DEFAULT_BLOCK_SIZE as u64
                && child.node.chunks.len() == 1
            {
                let entry_size = child.node.inode.i_size;
                let origin_chunk = child.node.chunks.first().unwrap().clone();
                let chunk_count =
                    (child.node.inode.i_size as f64 / (DEFAULT_BLOCK_SIZE) as f64).ceil() as usize;
                child.node.inode.i_child_count = chunk_count as u32;
                let mut chunks = Vec::with_capacity(chunk_count);
                for i in 0..chunk_count {
                    let offset = i * DEFAULT_BLOCK_SIZE as usize;
                    let chunk_size = if i == chunk_count - 1 {
                        entry_size - (i * DEFAULT_BLOCK_SIZE as usize) as u64
                    } else {
                        DEFAULT_BLOCK_SIZE as u64
                    };
                    let new_chunk = OndiskChunkInfo {
                        block_id: origin_chunk.block_id,
                        blob_index: origin_chunk.blob_index,
                        flags: origin_chunk.flags,
                        compress_size: origin_chunk.compress_size,
                        decompress_size: chunk_size as u32,
                        compress_offset: origin_chunk.compress_offset + offset as u64,
                        decompress_offset: origin_chunk.decompress_offset,
                        file_offset: offset as u64,
                        reserved: origin_chunk.reserved,
                    };
                    chunks.push(new_chunk);
                }
                child.node.chunks = chunks;
            }

            // Store node for bootstrap & blob dump.
            // Put the whiteout file of upper layer in the front of node list for layered build,
            // so that it can be applied to the node tree of lower layer first than other files of upper layer.
            match child.node.whiteout_type(&WhiteoutSpec::Oci) {
                Some(whiteout_type) => {
                    // Remove overlayfs opaque xattr for single layer build
                    if whiteout_type == WhiteoutType::OverlayFSOpaque {
                        child
                            .node
                            .remove_xattr(&OsString::from(OVERLAYFS_WHITEOUT_OPAQUE));
                    }
                    nodes.push(child.node.clone());
                }
                _ => {
                    nodes.push(child.node.clone());
                }
            }

            if child.node.is_dir() {
                dirs.push(child);
            }
        }

        // According to filesystem semantics, a parent dir should have nlink equal to
        // 2 plus the number of its child directory. And in case of layered build,
        // updating parent directory's nlink here is reliable since builder re-constructs
        // the entire tree and intends to layout all inodes into a plain array fetching
        // from the previously applied tree.
        if tree.node.is_dir() {
            let parent_dir = &mut nodes[tree.node.index as usize - 1];
            parent_dir.inode.i_nlink = (2 + dirs.len()) as u32;
        }

        for dir in dirs {
            self.build_rafs(dir, nodes);
        }
    }
}

pub struct BootstrapBuilder {
    super_block: OndiskSuperBlock,
    inode_map: HashMap<(Inode, u64), Vec<u64>>,
    blob_table: OndiskBlobTable,
    nodes: Vec<Node>,
    // writer: Option<Box<dyn RafsIoWrite>>,
    bootstrap_path: Option<PathBuf>,
    node_path_map: HashMap<PathBuf, u64>,
    node_path_blob_id_map: HashMap<PathBuf, u32>,
}

impl BootstrapBuilder {
    pub fn new() -> Self {
        BootstrapBuilder {
            super_block: Default::default(),
            inode_map: HashMap::new(),
            blob_table: OndiskBlobTable::new(),
            nodes: Vec::new(),
            bootstrap_path: None,
            node_path_map: HashMap::new(),
            node_path_blob_id_map: HashMap::new(),
        }
    }

    pub fn bootstrap_path(&mut self, val: PathBuf) -> &mut Self {
        self.bootstrap_path = Some(val);
        self
    }

    pub fn build_bootstrap(&self) -> Bootstrap {
        let writer = Box::new(BufWriter::with_capacity(
            BUF_WRITER_CAPACITY,
            OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(&self.bootstrap_path.clone().unwrap())
                .with_context(|| {
                    format!("failed to create bootstrap file {:?}", &self.bootstrap_path)
                })
                .unwrap(),
        )) as Box<dyn RafsIoWrite>;

        Bootstrap {
            super_block: self.super_block.to_owned(),
            inode_map: self.inode_map.to_owned(),
            blob_table: self.blob_table.to_owned(),
            nodes: self.nodes.to_owned(),
            writer,
            node_path_map: self.node_path_map.to_owned(),
            node_path_blob_id_map: self.node_path_blob_id_map.to_owned(),
        }
    }
}

pub fn build_bootstrap(stargz_dir: &str, bootstrap_path: &str, stargz_config_path: &str) {
    let stargz_dir = Path::new(stargz_dir);
    let stargz_config_path = Path::new(stargz_config_path);

    let blob_id_toc_index = fs::read_to_string(stargz_config_path).unwrap();
    let blob_id_toc_index: BlobIdsTocIndexes = serde_json::from_str(&blob_id_toc_index).unwrap();
    let toc_indexes: BlobIdTocIndex = blob_id_toc_index.entries;
    let blob_ids: BlobIds = blob_id_toc_index.blobIds;
    BootstrapBuilder::new()
        .bootstrap_path(PathBuf::from(bootstrap_path))
        .build_bootstrap()
        .build(toc_indexes, blob_ids) // build
        .dump(); // dump file

    // TODO validate bootstrap
}

pub fn is_tar(dir: &Path) -> Result<bool, ()> {
    Ok(dir.to_str().unwrap().ends_with(".tar"))
}
