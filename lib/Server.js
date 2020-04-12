const _ = require('lodash');
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


class Server {
    constructor(wsServer, connectionManager, allowOrigins) {
        const emitter = this.emitter = new EventEmitter();
        this.wsServer = wsServer;
    
        this.peers = connectionManager;
        this.allowOrigins = allowOrigins || [];
    
        this.peers.onAdd = (peer) => {
            emitter.emit('connection', peer);
        };
    
        this.peers.onRemove = (peer) => {
            emitter.emit('disconnection', peer);
        };
    
        this.wsServer.on('request', req => this.connectionHandler(req));
    }

    getApi() {
        const api = {};
    
        api.on = this.emitter.on.bind(this.emitter);
        api.removeListener = this.emitter.removeListener.bind(this.emitter);
    
        Object.defineProperty(api, 'connections', {
            get: this.peers.get.bind(this.peers)
        });
    
        return api;
    };

    connectionHandler(request) {
        // Make sure we only accept requests from an allowed origin
        if (!this.originIsAllowed(request.origin)) {
            request.reject();
            console.log(`${new Date()} Connection from origin ${request.origin} rejected.`);
            return;
        }
    
        // TODO rm request
        console.log(request);

        const address = uuid.v4(),
            peers = this.peers,
            peer = Connection.create(address, this.peers, request.accept(PROTOCOL_NAME, request.origin));
        
        peers.add(peer);
    
        peer.on('close', () => {
            peers.remove(peer);
        });
    };

    originIsAllowed(origin) {
        if (this.allowOrigins.length === 0) {
            return true;
        }
        return _.indexOf(this.allowOrigins, origin) > -1;
    };
}


/**
 * // TODO secret
 * create function
 * @param options {
 *   host, // hostname with port or only one
 *   hostname, // host name
 *   port, // listenPort
 *   allowOrigins, // xxx,xxx
 *   secret, // xxxx
 *   httpServer,
 *   wsServer,
 * }
 */
function create(options) {
    let host,
        server,
        allowOrigins,
        secret;

    options = options || {};
    if(options.host) {
        host = options.host.split(':');

        if(!('hostname' in options)) options.hostname = host[0];
        if(!('port' in options) && host[1]) options.port = host[1];
    }

    if(!('port' in options)) options.port = DEFAULT_PORT;

    
    if(options.allowOrigins && typeof options.allowOrigins === 'string') {
        allowOrigins = `${options.allowOrigins}`.split(',');
        console.log(`flower-lookup allow requests from ${options.allowOrigins} origins`);
    }

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

    server = new Server(options.wsServer, connectionManager, allowOrigins);
    return server.getApi();
};

Server.create = create;

module.exports = Server;
