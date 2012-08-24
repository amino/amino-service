exports.attach = function (options) {
  var amino = this;
  var Service = require('./lib/service');
  this.createService = function (name, server) {
    return new Service(name, server, options);
  };
};