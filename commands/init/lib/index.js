'use strict';

const Command = require('@almost-cli/command');
const log = require('@almost-cli/log');

class InitCommand extends Command {
  init () {
    const projectName = this._argv[0]
    const force = this._argv[1].force;
    log.verbose('projectName', projectName)
    log.verbose('force', force)
  }

  exec () {
    console.log('exec')
  }
}

function init(argv) {
  new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
