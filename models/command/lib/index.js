'use strict';

const semver = require('semver');
const colors = require('colors');
const log = require('@almost-cli/log');

const LOWEST_NODE_VERSION = '14.0.0';

class Command {
  constructor (argv) {
    if (!argv) {
      throw new Error('参数不能为空！')
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组！')
    }
    if (argv.length < 1) {
      throw new Error('参数列表为空！')
    }
    this._argv = [...argv];
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch(error => {
        log.error(error.message)
      })
    })
  }



  checkNodeVersion() {
    // 1、获取当前Node版本号
    const currentVersion = process.version;
    // 2、获取最低Node版本号
    const lowestVersion = LOWEST_NODE_VERSION;
    // 3、比对最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`almost-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`))
    }
  }

  initArgs () {
    this._cmd = this._argv.pop();
  }

  init () {
    throw new Error('init 必须是实现！')
  }

  exec () {
    throw new Error('exec 必须是实现！')
  }
}

module.exports = Command;

