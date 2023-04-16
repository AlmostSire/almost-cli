'use strict';
const path = require('path');
const fse = require('fs-extra');
const cp = require('child_process');
const inquirer = require('inquirer');
const semver = require('semver');
const Command = require('@almost-cli/command');
const Package = require('@almost-cli/package');
const log = require('@almost-cli/log');
const { createSpinner, sleep, execAsync } = require('@almost-cli/utils')

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._argv[1].force;
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec() {
    try {
      // 1、准备阶段
      const ret = await this.prepare();
      if (!ret) return;
      // 2、下载模版
      await this.download();
      // 3、安装模版
      await this.install();
    } catch (e) {
      log.error(e.message)
    }
  }

  async prepare() {
    // 0、判断项目模版是否存在 
    this.templates = await getProjectTemplate();
    if (!this.templates || this.templates.length === 0) {
      throw new Error('项目模版不存在！')
    }
    log.verbose('templates', this.templates);
    // 1、判断当前目录是否空
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ifContinue',
            message: '当前目录不为空，是否继续创建？',
            default: true
          }
        ])).ifContinue
        if (!ifContinue) return;
      }
      // 2、是否启动强制更新
      if (ifContinue || this.force) {
        // 询问是否清空当前目录
        const { confirmDelete } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDelete',
            message: '是否清空当前目录下的文件？',
            default: true
          }
        ])
        if (!confirmDelete) return;
        // 清空当前目录
        fse.emptyDirSync(localPath)

      }
    }
    return this.getInfo();
  }

  async download() {
    this.templateInfo = this.templates.find(item => item.npmName === this.projectInfo.template);
    log.verbose('templateInfo', this.templateInfo)
    if (!this.templateInfo) {
      throw new Error('模版信息不存在！');
    }

    const targetPath = path.resolve(process.env.CLI_HOME_PATH, 'template');
    const storeDir = path.resolve(targetPath, 'node_modules');
    const { npmName: packageName, version: packageVersion } = this.templateInfo;

    this.templatePkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    })

    if (!(await this.templatePkg.exists())) {
      const spinner = createSpinner('正在下载模版...');
      spinner.start();
      await sleep();
      try {
        await this.templatePkg.install();
        spinner.stop(true);
        log.success('下载模版成功');
      } catch (e) {
        throw (e)
      } finally {
        spinner.stop(true);
      }
    } else {
      const spinner = createSpinner('正在更新模版...');
      spinner.start();
      await sleep();
      try {
        await this.templatePkg.update();
        spinner.stop(true);
        log.success('更新模版成功');
      } catch (e) {
        throw (e)
      } finally {
        spinner.stop(true);
      }
    }

  }

  async install() {
    if (!this.templateInfo.type) {
      this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
    }
    if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
      // 标准安装
      await this.installNormal();
    } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
      // 自定义安装
      await this.installCustom();
    } else {
      throw new Error('无法识别项目模版类型！')
    }
  }

  async installNormal() {
    // 拷贝模版代码到当前目录
    const spinner = createSpinner('正在安装模版...');
    spinner.start();
    await sleep();
    try {
      const targetPath = process.cwd();
      const templatePath = path.resolve(this.templatePkg.cacheFilePath, 'template');
      fse.ensureDirSync(targetPath);
      fse.ensureDirSync(templatePath);
      fse.copySync(templatePath, targetPath);
      spinner.stop(true);
      log.success('安装模版成功！')
    } catch (e) {
      throw e
    } finally {
      spinner.stop(true);
    }


    const { installCommand, startCommand } = this.templateInfo;
    // 依赖安装
    if (installCommand) {
      const installCmd = installCommand.split(' ');
      const cmd = installCmd[0];
      const args = installCmd.slice(1);

      const ret = await execAsync(cmd, args, {
        cwd: process.cwd(),
        stdio: 'inherit'
      })

      if (ret !== 0) {
        throw new Error('依赖安装失败！')
      }
      // 启动命令
      if (startCommand) {
        const startCmd = startCommand.split(' ');
        const cmd = startCmd[0];
        const args = startCmd.slice(1);
        await execAsync(cmd, args, {
          cwd: process.cwd(),
          stdio: 'inherit'
        })
      }

    }
  }

  async installCustom() {
    console.log('自定义安装')
  }


  async getInfo() {
    // 1、选择创建项目或组件
    const { type } = await inquirer.prompt([{
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT
      }, {
        name: '组件',
        value: TYPE_COMPONENT
      }]
    }])
    log.verbose('type', type)
    // 2、获取项目基本信息
    if (type === TYPE_PROJECT) {
      const info = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: '请输入项目名称',
        default: 'project',
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            // 1、首字符必须为英文字符
            // 2、尾字符必须为英文或者数字，不能为字符
            // 3、字符仅允许 “_-”
            if (!/^[a-zA-Z]+((-|_)[a-zA-Z][a-zA-Z0-9]*)*$/.test(v)) {
              done('请输入合法项目名称！')
              return;
            }
            done(null, true)
          }, 0);
        },
        filter: function (v) {
          return v;
        }
      }, {
        type: 'input',
        name: 'version',
        message: '请输入项目版本号',
        default: '0.0.0',
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!semver.valid(v)) {
              done('请输入合法版本号！')
              return;
            }
            done(null, true)
          }, 0);
        },
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v)
          }
          return v
        }
      }, {
        type: 'list',
        name: 'template',
        message: '请选择项目模版',
        default: '0.0.0',
        choices: this.createTemplateChoice()
      }])
      this.projectInfo = {
        type,
        ...info
      }
      log.verbose('projectInfo', this.projectInfo)
      return this.projectInfo;
    } else {

    }

  }

  createTemplateChoice() {
    return this.templates.map(item => ({
      value: item.npmName,
      name: item.name
    }))
  }

  isDirEmpty(localPath) {
    // 文件过滤逻辑
    let fileList = fse.readdirSync(localPath).filter(file => (
      !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
    ))

    return !fileList || fileList.length <= 0;
  }
}

function init(argv) {
  new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
