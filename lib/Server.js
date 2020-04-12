const http = require('http');
const uuid = require('node-uuid');
const EventEmitter = require('events').EventEmitter;
const WebSocketServer = require('websocket').server;

const Connection = require('./Connection.js');
const ConnectionManager = require('./ConnectionManager.js');

const protocol = require('./protocol.js');
const MESSAGE_TYPE = protocol.MESSAGE_TYPE;
const PROTOCOL_NAME = protocol.NAME;

const DEFAULT_PORT = 20500;

const Server = module.exports = function(wsServer, connectionManager) {
    const emitter = this.emitter = new EventEmitter();
    this.wsServer = wsServer;

    this.peers = connectionManager;

    this.peers.onAdd = function(peer) {
        emitter.emit('connection', peer);
    };

    this.peers.onRemove = function(peer) {
        emitter.emit('disconnection', peer);
    };

    this.wsServer.on('request', this.connectionHandler.bind(this));
};

/**
 * constructor function
 * @param options {
 *   host,
 *   hostname,
 *   port,
 *   httpServer,
 *   wsServer,
 * }
 */
Server.create = function(options) {
    let host,
        server;

    options = options || {};
    if(options.host) {
        host = options.host.split(':');

        if(!('hostname' in options)) options.hostname = host[0];
        if(!('port' in options) && host[1]) options.port = host[1];
    }

    if(!('port' in options)) options.port = DEFAULT_PORT;

    if(!('httpServer' in options)) {
        options.httpServer = http.createServer();

        console.log('flower-lookup listening on ' + (options.hostname? options.hostname : "*") + ":" + options.port);

        options.httpServer.listen(options.port, options.hostname || void 0);
    }

    if(!('wsServer' in options)) {
        options.wsServer = new WebSocketServer({
            httpServer: options.httpServer,
            autoAcceptConnections: false,
        });
    }

    const connectionManager = new ConnectionManager();

    server = new Server(options.wsServer, connectionManager);
    return server.getApi();
};

Server.prototype.getApi = function() {
    const api = {};

    api.on = this.emitter.on.bind(this.emitter);
    api.removeListener = this.emitter.removeListener.bind(this.emitter);

    Object.defineProperty(api, 'connections', {
        get: this.peers.get.bind(this.peers)
    });

    return api;
};

Server.prototype.connectionHandler = function(request) {
    const address = uuid.v4(),
        peers = this.peers,
        peer = Connection.create(address, this.peers, request.accept(PROTOCOL_NAME, request.origin));
    
    peers.add(peer);

    peer.on('close', function() {
        peers.remove(peer);
    });
};
