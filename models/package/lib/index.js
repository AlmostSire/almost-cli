'use strict';

const path = require('path');
const pkgDir = require('pkg-dir').sync
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;

const { isObject } = require('@almost-cli/utils');
const { getDefaultRegistry, getNpmLatestVersion } = require('@almost-cli/get-npm-info')

class Package {
  constructor(options) {
    if (!options || !isObject(options)) {
      throw new Error('Package 类的 options 参数不能为空');
    }
    if (!isObject(options)) {
      throw new Error('Package 类的 options 参数必须为对象');
    }

    // package 目标路径
    this.targetPath = options.targetPath;
    // package 缓存路径
    this.storeDir = options.storeDir;
    // package 名称
    this.packageName = options.packageName
    // package 版本
    this.packageVersion = options.packageVersion
  }

  async prepare() {
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return this.getSpecificCacheFilePath(this.packageVersion)
  }

  getSpecificCacheFilePath(packageVersion) {
    const prefix = this.packageName.replace('/', '+') + '@' + packageVersion
    return path.resolve(this.storeDir, '.store', prefix, 'node_modules', this.packageName)
  }

  // 判断当前 package 是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }
  // 安装 package
  install(version) {
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.packageName,
        version: version || this.version
      }]
    })
  }
  // 更新 package
  async update() {
    // 1、获取最新的npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    // 2、获取最新版本对应的缓存路径
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3、判断路径是否存在，不存在时安装最新版本
    if (!pathExists(latestFilePath)) {
      await this.install(latestPackageVersion)
      this.packageVersion = latestPackageVersion;
    }
  }
  // 获取入口文件路径
  getRootFilePath() {
    const _getRootFilePath = (targetPath) => {
      // 1、获取package.json所在目录 - pkg-dir
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2、读取package.json - require
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // 3、寻找 main/lib - path
        if (pkgFile && pkgFile.main) {
          return path.resolve(dir, pkgFile.main);
        }
      }
      return null
    }
    if (this.storeDir) {
      return _getRootFilePath(this.cacheFilePath)
    } else {
      return _getRootFilePath(this.targetPath)
    }
  }
  
}

module.exports = Package;
