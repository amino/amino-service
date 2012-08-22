var Service = require('./lib/service');

exports.attach = function (options) {
  this.createService = function (name, server) {
    return new Service(name, server, options);
  };
};