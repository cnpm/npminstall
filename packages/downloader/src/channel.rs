use std::future::Future;
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio::task::JoinHandle;

pub fn subscriber<T: Send + 'static>(consumer_count: usize) -> (Sender<T>, Vec<Receiver<T>>) {
    let (sx, mut rx) = mpsc::channel(consumer_count);
    let mut sx_list = Vec::with_capacity(consumer_count);
    let mut rx_list = Vec::with_capacity(consumer_count);
    for _ in 0..consumer_count {
        let (sx, rx) = mpsc::channel(1);
        sx_list.push(sx);
        rx_list.push(rx);
    }
    tokio::spawn(async move {
        let mut msg_count = 0usize;
        let sx_list = sx_list;
        while let Some(msg) = rx.recv().await {
            let sx_index = msg_count % consumer_count;
            sx_list[sx_index].send(msg).await;
            msg_count += 1;
        }
    });
    (sx, rx_list)
}
