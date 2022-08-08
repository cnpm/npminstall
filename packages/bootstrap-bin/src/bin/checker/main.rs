use nydus_bootstrap::validator::Validator;
use simple_logger::SimpleLogger;
use std::path::Path;

fn main() {
    SimpleLogger::new().init().unwrap();

    let mut bootstrap = Validator::new(Path::new(
        "/Users/killa/workspace/project/tnpm/downloader/bucket 2/nydusd-bootstrap",
    ))
    .unwrap();
    let res = bootstrap.check(true);
    println!("res: {:?}", res);
}
