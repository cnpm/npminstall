'use strict';

// make sure buffer.alloc exists on 4.2.3 <= Node.js < 4.5.0
// it use on tar@^4.0.0

if (typeof Buffer.alloc === 'undefined') {
  Buffer.alloc = function alloc(size, fill, encoding) {
    const buf = new Buffer(size);
    buf.fill(fill, encoding);
    return buf;
  };
}
