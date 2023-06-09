
module.exports = core;

const path = require('path');
const os = require('os');

const semver = require('semver');
const colors = require('colors');
const pathExists = require('path-exists').sync;
const rootCheck = require('root-check');
const dotenv = require('dotenv');
const { createCommand } = require('commander')

const log = require('@almost-cli/log');
const { getNpmLatestVersion } = require('@almost-cli/get-npm-info');
const exec = require('@almost-cli/exec');

const pkg = require('../package.json');
const { DEFAULT_CLI_HOME } = require('./const');

const userHome = os.homedir();
const program = createCommand();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message)
  }
}

function checkPkgVersion() {
  log.notice('almost-cli', pkg.version)
}


function checkRoot() {
  rootCheck();
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'))
  }
}

function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    })
  }
  createDefaultConfig();
}

function createDefaultConfig() {
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

async function checkGlobalUpdate() {
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

async function prepare() {
  checkPkgVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option('-d, --debug', "是否开启调试模式", false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径')

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec)


  // 开启 debug 模式
  program.on('option:debug', function () {
    const debug = program.getOptionValue('debug');
    if (debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
  })

  // 指定 targetPath
  program.on('option:targetPath', function (targetPath) {
    process.env.CLI_TARGET_PATH = targetPath;
  })

  // 未知命令监听
  program.on('command:*', function (cmds) {
    const availableCommands = program.commands.map(cmd => cmd.name());
    log.error('未知命令：' + cmds[0]);
    if (availableCommands.length) {
      log.info("可用命令：", availableCommands.join(','))
    }
  })
  // 参数解析
  program.parse(process.argv);
  if (program.args.length < 1) {
    program.outputHelp();
    console.log()
  }
}