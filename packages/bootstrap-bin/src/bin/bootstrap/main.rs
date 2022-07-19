use clap::{App, Arg};
use nydus_bootstrap::bootstrap::build_bootstrap;
use nydus_utils::BuildTimeInfo;
#[macro_use(crate_authors, crate_version)]
extern crate clap;

fn main() {
    let (bti_string, _) = BuildTimeInfo::dump(crate_version!());
    let cmd_arguments = App::new("")
        .version(bti_string.as_str())
        .author(crate_authors!())
        .about("Nydus bootstrap")
        .arg(
            Arg::with_name("bootstrap")
                .long("bootstrap")
                .help("rafs bootstrap file")
                .takes_value(true)
                .min_values(1)
                .conflicts_with("shared-dir"),
        )
        .arg(
            Arg::with_name("stargz-dir")
                .long("stargz-dir")
                .help(
                    "Digest single npm bootstrap files to bootstrap config from the dir provided.",
                )
                .takes_value(true)
                .required(true),
        )
        .arg(
            Arg::with_name("stargz-config-path")
                .long("stargz-config-path")
                .help("stargz config json file path for searchable tar entries.")
                .takes_value(true)
                .required(true),
        );

    let cmd_arguments_parsed = cmd_arguments.get_matches();
    let bootstrap_path = cmd_arguments_parsed.value_of("bootstrap").unwrap();

    let stargz_dir = cmd_arguments_parsed
        .value_of("stargz-dir")
        .map(|s| s.to_string())
        .unwrap();

    let stargz_config_path = cmd_arguments_parsed
        .value_of("stargz-config-path")
        .map(|s| s.to_string())
        .unwrap();

    build_bootstrap(&stargz_dir, bootstrap_path, &stargz_config_path);
}
