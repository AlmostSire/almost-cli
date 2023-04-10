'use strict';

module.exports = exec;

const path = require('path');

const log = require('@almost-cli/log');
const Package = require('@almost-cli/package');

const SETTINGS = {
  init: "@almost-cli/init"
}

const CACHE_DIR = 'dependencies';

async function exec() {
  const homePath = process.env.CLI_HOME_PATH;
  let targetPath = process.env.CLI_TARGET_PATH;
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  let storeDir = '';
  let pkg = null;
  
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, 'node_modules')
    log.verbose('targetPath', targetPath)
    log.verbose('storeDir', storeDir)
    pkg = new Package({
      targetPath,
      storeDir,
      packageName: packageName,
      packageVersion: packageVersion
    });
    if (await pkg.exists()) {
      await pkg.update();
    } else {
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    })
  }

  const rootFile = pkg.getRootFilePath()
  
  if (rootFile) {
    // 在当前进程中调中
    require(rootFile)(...arguments);
    // 在node子进程中调用
  }
  
}
