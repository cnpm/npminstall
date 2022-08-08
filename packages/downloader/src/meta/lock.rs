use crate::meta::{PackageRequest, PackageRequestBuilder};
use serde::{Deserialize, Serialize};

use std::collections::HashMap;

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct PackageLock {
    #[serde(rename = "lockfileVersion")]
    lockfile_version: u8,
    requires: bool,
    packages: HashMap<String, PackageLockPackage>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct PackageLockPackage {
    version: Option<String>,
    resolved: Option<String>,
    integrity: Option<String>,
}

impl PackageLock {
    pub fn list_all_packages(&self) -> Vec<PackageRequest> {
        let mut pkg_map: HashMap<String, PackageRequest> = HashMap::new();
        for (name, dependency) in &self.packages {
            let prefix = "node_modules/";
            let prefix_len = prefix.len();
            if let Some(index) = name.rfind(prefix) {
                let name = &name[(index + prefix_len)..];
                let replace_str = format!("https://registry.npmmirror.com/{}/download", name);
                let pkg = PackageRequestBuilder::new()
                    .name(name)
                    .version(dependency.version.as_ref().unwrap())
                    .sha(dependency.integrity.as_ref().unwrap())
                    .url(
                        &dependency
                            .resolved
                            .as_ref()
                            .unwrap()
                            .replace(&replace_str, "http://127.0.0.1:8888"),
                    )
                    .build()
                    .unwrap();
                pkg_map.insert(format!("{}@{}", name, pkg.version()), pkg);
            }
        }
        pkg_map.into_iter().map(|(_, pkg)| pkg).collect()
    }
}

pub fn get_chair_lock() -> PackageLock {
    let tree_json = include_str!("../../test/fixtures/tree.json");
    let lock: PackageLock = serde_json::from_str(tree_json).unwrap();
    lock
}
