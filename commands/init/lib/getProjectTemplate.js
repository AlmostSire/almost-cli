const request = require('@almost-cli/request');

module.exports = function () {
  return request({
    url: '/project/template'
  })
}