use crate::TocIndex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::format;
use std::ops::Range;
use std::sync::Mutex;

pub type TocMap = HashMap<String /* tarName */, TocIndex>;
pub type TocIndicesMap =
    HashMap<String /* packageName */, HashMap<String /* tarName */, Range<usize>>>;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TocIndexStoreData {
    pub toc_map: TocMap,
    pub indices: TocIndicesMap,
}

#[derive(Clone)]
struct TocIndexStoreInner {
    toc_map: TocMap,
    indices: TocIndicesMap,
}

impl TocIndexStoreInner {
    fn new() -> Self {
        TocIndexStoreInner {
            toc_map: HashMap::new(),
            indices: HashMap::new(),
        }
    }
}

pub struct TocIndexStore {
    inner: Mutex<TocIndexStoreInner>,
}

impl TocIndexStore {
    pub fn new() -> Self {
        TocIndexStore {
            inner: Mutex::new(TocIndexStoreInner::new()),
        }
    }

    pub fn restore(toc_map: TocMap, indices: TocIndicesMap) -> Self {
        TocIndexStore {
            inner: Mutex::new(TocIndexStoreInner { toc_map, indices }),
        }
    }

    pub fn add_package(&self, name: &str, version: &str, blob_id: &str, mut toc_index: TocIndex) {
        let pkg_entry_count = toc_index.entries.len();
        let index_start = self.add_package_toc(blob_id, toc_index);
        self.add_package_index(
            name,
            version,
            blob_id,
            index_start..index_start + pkg_entry_count,
        );
    }

    pub fn dump(&self) -> TocIndexStoreData {
        let inner = self.inner.lock().expect("toc index store lock failed");
        TocIndexStoreData {
            toc_map: inner.toc_map.clone(),
            indices: inner.indices.clone(),
        }
    }

    fn add_package_toc(&self, blob_id: &str, mut toc_index: TocIndex) -> usize {
        let mut inner = self.inner.lock().expect("toc index store lock failed");
        if let Some(exits_toc_index) = inner.toc_map.get_mut(blob_id) {
            let cur_len = exits_toc_index.entries.len();
            exits_toc_index.entries.append(&mut toc_index.entries);
            cur_len
        } else {
            inner.toc_map.insert(String::from(blob_id), toc_index);
            0
        }
    }

    fn add_package_index(&self, name: &str, version: &str, blob_id: &str, range: Range<usize>) {
        let mut inner = self.inner.lock().expect("toc index store lock failed");
        let id = TocIndexStore::package_id(name, version);
        if let Some(index_map) = inner.indices.get_mut(&id) {
            index_map.insert(String::from(blob_id), range);
        } else {
            let mut index_map = HashMap::new();
            index_map.insert(String::from(blob_id), range);
            inner.indices.insert(id, index_map);
        }
    }

    fn package_id(name: &str, version: &str) -> String {
        format!("{}@{}", name, version)
    }
}
