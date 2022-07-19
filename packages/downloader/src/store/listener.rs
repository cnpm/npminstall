use glob::Pattern;
use std::path::{Components, Path, PathBuf};
use std::sync::Arc;
use tokio::io::AsyncRead;
use tokio::sync::mpsc::Sender;

pub struct PackageEntry {
    pub pkg_name: String,
    pub entry_name: String,
    pub reader: Box<dyn AsyncRead + Send + Unpin + Sync>,
}

#[derive(Debug, Clone)]
pub struct EntryListener {
    whitelist: Vec<Pattern>,
    sender: Arc<Sender<Option<PackageEntry>>>,
}

impl EntryListener {
    pub fn new(whitelist: Vec<String>, sender: Arc<Sender<Option<PackageEntry>>>) -> Self {
        EntryListener {
            whitelist: whitelist
                .iter()
                .map(|file_pattern| Pattern::new(file_pattern).expect("pattern is invalidate"))
                .collect(),
            sender,
        }
    }

    pub fn should_send_entry<P: AsRef<Path>>(self: &Self, entry_path: P) -> bool {
        self.whitelist
            .iter()
            .find(|file_pattern| {
                file_pattern.matches(entry_path.as_ref().to_string_lossy().as_ref())
            })
            .is_some()
    }

    pub async fn send_entry(self: &Self, entry: PackageEntry) {
        self.sender.send(Some(entry)).await;
    }

    pub async fn shutdown(self: &Self) {
        if self.sender.is_closed() {
            return;
        }
        self.sender.send(None).await;
        self.sender.closed().await;
    }
}
