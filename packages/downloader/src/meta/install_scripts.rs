use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Scripts {
    install: Option<String>,
    preinstall: Option<String>,
    postinstall: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Package {
    name: String,
    version: String,
    scripts: Option<Scripts>,
    optional: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PreInstallScript {
    root: PathBuf,
    display_name: String,
    pkg: Package,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PostInstallScript {
    root: PathBuf,
    display_name: String,
    pkg: Package,
    optional: Option<bool>,
}

trait Setup {
    fn new(root: PathBuf, pkg: Package) -> Self;
    fn set_display_name(&mut self) -> &mut Self;
    fn update_optional(&mut self) -> &mut Self {
        self
    }
}

impl Setup for PreInstallScript {
    fn new(root: PathBuf, pkg: Package) -> PreInstallScript {
        PreInstallScript {
            root,
            display_name: format!("{}@{}", pkg.name, pkg.version),
            pkg,
        }
    }

    fn set_display_name(&mut self) -> &mut PreInstallScript {
        self.display_name = format!("{}@{}", &self.pkg.name, &self.pkg.version);
        self
    }
}

impl Setup for PostInstallScript {
    fn new(root: PathBuf, pkg: Package) -> PostInstallScript {
        PostInstallScript {
            root,
            display_name: format!("{}@{}", pkg.name, pkg.version),
            pkg,
            optional: None,
        }
    }

    fn set_display_name(&mut self) -> &mut PostInstallScript {
        self.display_name = format!("{}@{}", &self.pkg.name, &self.pkg.version);
        self
    }

    fn update_optional(&mut self) -> &mut PostInstallScript {
        self.optional = self.pkg.optional;
        self
    }
}
#[derive(Debug, PartialEq, Eq)]
pub struct InstallScripts {
    pub postinstalls: Vec<PostInstallScript>,
    pub preinstalls: Vec<PreInstallScript>,
}

impl InstallScripts {
    fn new() -> InstallScripts {
        InstallScripts {
            postinstalls: Vec::new(),
            preinstalls: Vec::new(),
        }
    }

    fn merge(&mut self, install_scripts: InstallScripts) -> &mut InstallScripts {
        &self.preinstalls.extend(install_scripts.preinstalls);
        &self.postinstalls.extend(install_scripts.postinstalls);
        self
    }

    fn update(&mut self, root: PathBuf, pkg: Package) -> &mut InstallScripts {
        if pkg.scripts.is_none() {
            return self;
        }

        let scripts = pkg.scripts.as_ref().unwrap();
        if scripts.install.is_some() {
            let mut install_script = PostInstallScript::new(root, pkg.clone());
            let install_script = install_script.set_display_name().update_optional();
            self.postinstalls.push(install_script.clone());
        } else if scripts.postinstall.is_some() {
            let postinstall_script = PostInstallScript::new(root, pkg.clone())
                .set_display_name()
                .update_optional()
                .clone();
            self.postinstalls.push(postinstall_script);
        } else if scripts.preinstall.is_some() {
            let preinstall_script = PreInstallScript::new(root, pkg.clone())
                .set_display_name()
                .clone();
            self.preinstalls.push(preinstall_script);
        }

        self
    }
}

#[cfg(test)]
trait Mock {
    fn mock_some() -> Self;

    fn mock_none() -> Self;
}

#[cfg(test)]
impl Mock for Package {
    fn mock_some() -> Package {
        Package {
            name: Uuid::new_v4().to_string(),
            version: "1.0.0".parse().unwrap(),
            scripts: Some(Scripts {
                install: Some("echo install.".parse().unwrap()),
                preinstall: Some("echo preinstall".parse().unwrap()),
                postinstall: None,
            }),
            optional: None,
        }
    }

    fn mock_none() -> Package {
        Package {
            name: Uuid::new_v4().to_string(),
            version: "1.0.0".parse().unwrap(),
            scripts: None,
            optional: None,
        }
    }
}

#[cfg(test)]
fn test_install_scripts() {
    let mut install_scripts = InstallScripts::new();
    let pkg1 = Package::mock_some();
    let pkg2 = Package::mock_none();

    install_scripts.update(PathBuf::from("/tmp"), pkg1);
    assert_eq!(
        install_scripts,
        InstallScripts {
            preinstalls: vec![],
            postinstalls: vec![],
        }
    );

    install_scripts.update(PathBuf::from("/tmp"), pkg2);
    assert_eq!(
        install_scripts,
        InstallScripts {
            preinstalls: vec![],
            postinstalls: vec![],
        }
    );
}
