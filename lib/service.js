var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , amino = require('amino')
  , Spec = require('amino-spec')
  , os = require('os')
  , dns = require('dns')

function Service (name, server, options) {
  var self = this;
  EventEmitter.call(this);
  this.setMaxListeners(0);

  this.closing = false;
  this.options = amino.utils.copy(options);
  this.server = server;

  if (typeof name === 'object') {
    this.spec = name;
    this.publishSpec();
  }
  else {
    // Get a host/port by configuration and/or discovery.
    this.spec = new Spec(name);

    // Close the server immediately, now that we have a port to use.
    server.once('listening', function () {
      self.spec.port = server.address().port;
      self.publishSpec();
    });

    // Attempt to get my address.
    self.ipAddress(function (err, address) {
      if (err) {
        amino.emit('error', new Error("could not autodetect host! Try setting service.options.host manually."));
        return;
      }

      self.spec.host = address;
      server.listen(0);
    });
  }

  server.once('close', this.onClose.bind(this));

  // Unpublish our spec if process closes.
  self.processListeners = {
    SIGINT: this.onTerminate('SIGINT'),
    SIGKILL: this.onTerminate('SIGKILL'),
    SIGTERM: this.onTerminate('SIGTERM')
  };

  Object.keys(this.processListeners).forEach(function (sig) {
    process.once(sig, self.processListeners[sig]);
  });
}
inherits(Service, EventEmitter);
module.exports = Service;

// Publish our spec.
Service.prototype.publishSpec = function () {
  var self = this;

  this.responder = function responder (id) {
    amino.publish('_get:' + self.spec.service + ':' + id, self.spec);
  };
  amino.subscribe('_get:' + this.spec.service, this.responder);
  amino.publish('_spec:' + this.spec.service, this.spec);

  self.emit('listening');
};

// Create a handler for process termination on a certain signal.
Service.prototype.onTerminate = function (sig) {
  var self = this;
  return function () {
    // Close the server when process is terminated.
    self.close(function () {
      if (!process.listeners(sig).length) {
        process.exit();
      }
    });
  };
};

// Get my IP address.
Service.prototype.ipAddress = function (done) {
  var self = this;
  if (!self.options.host) {
    dns.lookup(os.hostname(), function (err, address, fam) {
      if (!err) {
        self.options.host = address;
      }
      done(err, self.options.host);
    });
  }
  else {
    done(null, self.options.host);
  }
};

// Close the server and the service.
Service.prototype.close = function (cb) {
  if (cb) this.once('close', cb);
  this.server.close();
  this.onClose();
};

// Close the service, unpublishing spec and shutting down the server (if we
// started one)
Service.prototype.onClose = function () {
  var self = this;
  if (this.closing) {
    return;
  }
  this.closing = true;

  if (this.responder) {
    amino.unsubscribe('_get:' + this.spec.service, this.responder);
    delete this.responder;

    amino.publish('_drop:' + this.spec.service, this.spec);
    amino.publish('_close:' + this.spec.service, this.spec);

    // If the server is manually closed, we don't want an event listener leak.
    Object.keys(this.processListeners).forEach(function (k) {
      process.removeListener(k, self.processListeners[k]);
    });
  }
  this.emit('close');
};