'use strict';
const mm = require('mm');

(() => {
  mm(process, 'platform', 'darwin');
  mm(process, 'arch', 'arm');
})();
