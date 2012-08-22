amino = require('amino')
  .use(require('../'))
  .init({service: false});

http = require('http');

assert = require('assert');