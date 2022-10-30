# Developement guideline

## Project structure

It's a [Lerna](https://github.com/lerna/lerna) monorepo and cargo workspace hybrid project.

```bash
/
├── package.json: npm deps
├── Cargo.toml: rust deps
├── .cargo: cargo config
├── integration ci
├── packages rust + npm package
│   ├── npminstall the npminstall CLI
│   ├── bootstrap: bootstrap lib
│   ├── bootstrap-bin: bootstrap bin(generate bootstrap file)/checker（bootstrap checker）
│   ├── downloader: downloader lib
│   ├── rafs: a minimal cropped version of [rafs](https://github.com/dragonflyoss/image-service/blob/master/rafs/README.md) , includes the metadata part.
│   ├── binding: rust binding
│   ├── binding-linux-arm64: rust linux arm64 binding
│   ├── binding-linux-x64: rust linux x64 binding
│   ├── tokio tar: a fork and bugfixed version of [tokio-tar](https://github.com/vorot93/tokio-tar)
│   └── utils: nydus utils
└── src: empry directory, becausecargo workspace needs a lib
```

## Test

### Install deps
```bash
npm i --force
```

### Install nginx


```bash
brew install nginx
```

```bash
yum install nginx
apt-get install nginx
```

### 

```bash
npm run init
```

### Node.js 测试

```bash
npm run test
```

### Rust 测试

```bash
cargo test --workspace
```

### Prepare Nydusd
Download prebuild binary from [image-service assets](https://github.com/dragonflyoss/image-service/releases)
For example, if you are using Linux
```bash
curl https://github.com/dragonflyoss/image-service/releases/download/v2.1.0/nydus-static-v2.1.0-linux-amd64.tgz | tar -zxf | mv nydus-static/nydusd npminstall/packages/npminstall/binding-linux-x64
```



## macOS deps
- [macFUSE](https://osxfuse.github.io/): Simply download from the officially website.
- [unionfs-fuse](https://github.com/rpodgorny/unionfs-fuse/tree/v2.1)
