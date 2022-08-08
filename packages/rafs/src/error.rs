// Copyright 2020 Ant Group. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0

/// Rafs related common error codes.
macro_rules! err_decompress_failed {
    () => {{
        use nydus_utils::eio;
        eio!("decompression failed")
    }};
}

macro_rules! err_invalid_superblock {
    () => {{
        use nydus_utils::einval;
        einval!("invalid superblock")
    }};
}
