'use strict';

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function sleep(timeout = 1000) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

function createSpinner(title = "loading...", string = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner;
  const spinner = new Spinner();
  spinner.setSpinnerTitle(title + " %s");
  spinner.setSpinnerString(string);
  return spinner;
}

function execAsync (...argv) {
  
  const cp = require('child_process');
  return new Promise((resolve, reject) => {
    const child = cp.spawn(...argv);
    child.on('error', e => {
      reject(e)
    })
    child.on('exit', c => {
      resolve(c)
    })
  })
}

module.exports = {
  isObject,
  sleep,
  createSpinner,
  execAsync
};

