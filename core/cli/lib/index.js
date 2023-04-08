
module.exports = core;

const path = require('path');
const os = require('os');

const semver = require('semver');
const colors = require('colors');
const pathExists = require('path-exists').sync;
const minimist = require('minimist');
const rootCheck = require('root-check');
const dotenv = require('dotenv');
const { createCommand } = require('commander')

const log = require('@almost-cli/log');
const { getNpmLatestVersion } = require('@almost-cli/get-npm-info');

const pkg = require('../package.json');
const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./const');

const userHome = os.homedir();
const program = createCommand();

async function core () {
  try {
    checkPkgVersion(); 
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
    registerCommand();
    log.verbose('debug', 'test debug log')
  } catch (e) {
    log.error(e.message)
  }
}

function checkPkgVersion() {
  log.notice('almost-cli', pkg.version)
}

function checkNodeVersion() {
  // 1、获取当前Node版本号
  const currentVersion = process.version;
  // 2、获取最低Node版本号
  const lowestVersion = LOWEST_NODE_VERSION;
  // 3、比对最低版本号
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`almost-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`))
  }
}

function checkRoot() {
  rootCheck();
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'))
  }
}

function checkInputArgs() {
  const args = minimist(process.argv.slice(2));
  checkArgs(args)
}

function checkArgs(args) {
  if (args.debug || args.d) {
    process.env.LOG_LEVEL = 'verbose';
  } else {
    process.env.LOG_LEVEL = 'info';
  }
  log.level = process.env.LOG_LEVEL;
}

function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    })
    createDefaultConfig();
    log.verbose('环境变量', process.env.CLI_HOME_PATH)
  } else {
    console.log('meiyou ')
  }
}

function createDefaultConfig () {
  const cliConfig = {
    home: userHome,
  }
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

async function checkGlobalUpdate () {
  // 获取当前版本号和模块名称
  const curVersion = pkg.version;
  const npmName = pkg.name;
  // 调用 npm API，获取最新版本号
  const lastVersion = await getNpmLatestVersion(npmName);
  // 比较最新版本是否大于当前版本
  if (lastVersion && semver.gt(lastVersion, curVersion)) {
      log.warn('更新提示', colors.yellow(`
          请手动更新 ${npmName}，当前版本：${curVersion}，最新版本：${lastVersion}
          更新命令：npm install ${npmName} -g
      `))
  }
}

function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option('-d, --debug', "是否开启调试模式", false)

  program.parse(process.argv);
}