'use strict';

module.exports = utils;

function utils() {
  const core = require('@almost-cli/core');
  console.log(core())
  return 'Hello from utils';
  
}

utils();
