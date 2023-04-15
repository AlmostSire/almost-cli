'use strict';

module.exports = exec;

const path = require('path');
const cp = require('child_process');
const log = require('@almost-cli/log');
const Package = require('@almost-cli/package');

const SETTINGS = {
  init: "@almost-cli/init"
}
const CACHE_DIR = 'dependencies';

async function exec(...argv) {
  const homePath = process.env.CLI_HOME_PATH;
  let targetPath = process.env.CLI_TARGET_PATH;
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  let storeDir = '';
  let pkg = null;

  const cmdObj = argv[argv.length - 1];
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
    try {
      // 在当前进程中调中
      // require(rootFile)(argv);
      // 在node子进程中调用
      const cmd = argv[argv.length - 1];
      const obj = Object.create(null);
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key)) {
          if (!key.startsWith('_') && key !== 'parent') {
            obj[key] = cmd[key]
          }
        }
      })
      argv[argv.length -1] = obj;
      const code = `require("${rootFile}")(${JSON.stringify(argv)})`;

      const child = cp.spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })
      child.on('error', e => {
        log.error(e.message);
        process.exit(1);
      })
      child.on('exit', e => {
        log.verbose('命令执行成功：' + e);
        process.exit(e);
      })
    } catch (err) {
      log.error(err.message)
    }
  }
}

// function spawn (command, args, options = {}) {
//   const win32 = process.platform === 'win32';
//   const cmd = win32 ? 'cmd' : command;
//   const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
//   return cp.spawn(cmd, cmdArgs, options)
// }
