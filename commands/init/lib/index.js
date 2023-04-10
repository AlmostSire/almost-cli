'use strict';

module.exports = init;

function init(projectName, options, command) {
  options = command.parent.opts();
  console.log('init', projectName, options)
}
