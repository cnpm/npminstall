#[cfg(target_os = "linux")]
use libc::{blksize_t, dev_t, mode_t, nlink_t, stat64, statvfs64};
use std::mem;
use std::time::Duration;

#[cfg(target_os = "macos")]
use libc::{
    blksize_t,
    dev_t,
    // statvfs as statvfs64,
    mode_t,
    nlink_t,
    stat as stat64,
};

#[repr(C)]
#[derive(Debug, Default, Copy, Clone)]
pub struct Attr {
    pub ino: u64,
    pub size: u64,
    pub blocks: u64,
    pub atime: u64,
    pub mtime: u64,
    pub ctime: u64,
    pub atimensec: u32,
    pub mtimensec: u32,
    pub ctimensec: u32,
    pub mode: u32,
    pub nlink: u32,
    pub uid: u32,
    pub gid: u32,
    pub rdev: u32,
    pub blksize: u32,
    pub padding: u32,
}
// unsafe impl ByteValued for Attr {}

impl From<stat64> for Attr {
    fn from(st: stat64) -> Attr {
        Attr {
            ino: st.st_ino,
            size: st.st_size as u64,
            blocks: st.st_blocks as u64,
            atime: st.st_atime as u64,
            mtime: st.st_mtime as u64,
            ctime: st.st_ctime as u64,
            atimensec: st.st_atime_nsec as u32,
            mtimensec: st.st_mtime_nsec as u32,
            ctimensec: st.st_ctime_nsec as u32,
            mode: st.st_mode as u32,
            nlink: st.st_nlink as u32,
            uid: st.st_uid,
            gid: st.st_gid,
            rdev: st.st_rdev as u32,
            blksize: st.st_blksize as u32,
            ..Default::default()
        }
    }
}

impl Into<stat64> for Attr {
    fn into(self) -> stat64 {
        // Safe because we are zero-initializing a struct
        let mut out: stat64 = unsafe { mem::zeroed() };
        out.st_ino = self.ino;
        out.st_size = self.size as i64;
        out.st_blocks = self.blocks as i64;
        out.st_atime = self.atime as i64;
        out.st_mtime = self.mtime as i64;
        out.st_ctime = self.ctime as i64;
        out.st_atime_nsec = self.atimensec as i64;
        out.st_mtime_nsec = self.mtimensec as i64;
        out.st_ctime_nsec = self.ctimensec as i64;
        out.st_mode = self.mode as mode_t;
        out.st_nlink = self.nlink as nlink_t;
        out.st_uid = self.uid;
        out.st_gid = self.gid;
        out.st_rdev = self.rdev as dev_t;
        out.st_blksize = self.blksize as blksize_t;

        out
    }
}

pub const ROOT_ID: u64 = 1;

#[derive(Copy, Clone)]
pub struct Entry {
    /// An `Inode` that uniquely identifies this path. During `lookup`, setting this to `0` means a
    /// negative entry. Returning `ENOENT` also means a negative entry but setting this to `0`
    /// allows the kernel to cache the negative result for `entry_timeout`. The value should be
    /// produced by converting a `FileSystem::Inode` into a `u64`.
    pub inode: u64,

    /// The generation number for this `Entry`. Typically used for network file systems. An `inode`
    /// / `generation` pair must be unique over the lifetime of the file system (rather than just
    /// the lifetime of the mount). In other words, if a `FileSystem` implementation re-uses an
    /// `Inode` after it has been deleted then it must assign a new, previously unused generation
    /// number to the `Inode` at the same time.
    pub generation: u64,

    /// Inode attributes. Even if `attr_timeout` is zero, `attr` must be correct. For example, for
    /// `open()`, FUSE uses `attr.st_size` from `lookup()` to determine how many bytes to request.
    /// If this value is not correct, incorrect data will be returned.
    pub attr: stat64,

    /// How long the values in `attr` should be considered valid. If the attributes of the `Entry`
    /// are only modified by the FUSE client, then this should be set to a very large value.
    pub attr_timeout: Duration,

    /// How long the name associated with this `Entry` should be considered valid. If directory
    /// entries are only changed or deleted by the FUSE client, then this should be set to a very
    /// large value.
    pub entry_timeout: Duration,
}
