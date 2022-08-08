/// cd tars
/// sh download.sh
/// sh server.sh
/// http://127.0.0.1:8888
pub fn get_download_url() -> Vec<&'static str> {
    vec![
        "http://127.0.0.1:8888/a-sync-waterfall-1.0.1.tgz",
        "http://127.0.0.1:8888/abbrev-1.1.1.tgz",
        "http://127.0.0.1:8888/accepts-1.3.7.tgz",
        "http://127.0.0.1:8888/acorn-5.7.4.tgz",
    ]
}
