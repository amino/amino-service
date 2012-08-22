var amino = require('amino')
  , assert = require('assert')
  , createServer = require('http').createServer

describe('basic test', function () {
  it('attaches', function () {
    amino
      .use(require('../'))
      .init({redis: false, service: false});

    assert.equal(typeof amino.createService, 'function');
  });
  var server;
  it('creates a service', function (done) {
    server = createServer(function (req, res) {
      res.end('cool stuff');
    });
    var service = amino.createService('cool-stuff@0.1.0', server);
    server.on('listening', function () {
      assert.equal(typeof service.spec.port, 'number');
      done();
    });
  });
  it('can request the service', function (done) {
    amino.request('cool-stuff@0.1.x', '/', function (err, res, body) {
      assert.equal(body, 'cool stuff');
      done();
    });
  });
  it('can close the server', function (done) {
    server.on('close', done);
    server.close();
  });
});