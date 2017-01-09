/**
 * Makes a UNIX domain socket server proxiable and helps our server
 * cleanup after itself to prevent EADDRINUSE exceptions.
 *
 * @module proxiable
 * @author Michael Welter <michael@yammm.com>
 * @copyright Copyright (c) 2017 Michael Welter <michael@yammm.com>
 * @license MIT
 * @example
 * const http = require("http");
 * const proxiable = require("proxiable");
 * ...
 * proxiable(server).listen("/var/run/proxiable.sock");
*/

"use strict";

const cluster = require("cluster");
const fs = require("fs");
const net = require("net");
const util = require("util");
const debuglog = util.debuglog("proxiable");
const noop = function() { };

/**
 * Closes our net.Server on process exit to help ensure our socket is unlicked
 *
 * @param {net.Server} server - UNIX domain socket server
 * @private
 */
function onExit(server) {
    // when using unix domain sockets this makes us happy and unlinks our socket
    if (server._handle) {
        debuglog("server.close()");
        server.close(noop);
    }

    debuglog("Sayonara");
}

/**
 * isSocket callback
 *
 * @callback isSocketCallback
 * @param {Error} err
 * @param {boolean} isSocket
 */

/**
 * Closes our net.Server on process exit to help ensure our socket is unlicked
 *
 * @param {string} address - UNIX domain socket path
 * @param {isSocketCallback} callback - The callback function(err, isSocket)
 * @private
 */
function isSocket(address, callback) {
    // are we bound to unix domain socket?
    if ("string" !== typeof address) {
        return callback(null, false);
    }

    fs.stat(address, function(err, stats) {
        if (err) {
            return callback(err, false);
        }

        return callback(null, stats.isSocket());
    });
}

/**
 * If our server is a UNIX domain socket then chmod 666 to make it readable and writeable
 *
 * @param {net.Server} server - UNIX domain socket server
 * @private
 */
function setReadWritable(server) {
    const address = server.address();

    isSocket(address, function(err, isSocket) {
        // are we bound to unix domain socket?
        if (!isSocket) {
            return debuglog("Nothing to do, we are not a UNIX domain socket server.");
        }

        // chmod so we can be proxied, 0666 needs to be a string
        debuglog("chmod 666 %s", address);
        fs.chmod(address, "0666", noop);

        // cleanup
        process.on("exit", function() { onExit(server); });
    });
}

/**
 * Checks if the existing address is an orphaned UNIX domain socket.
 * If so, will unlink it and retry listen.
 *
 * @private
 */
function retryIfOrphaned(server) {
    const address = server.address();

    var listen = function() {
        listen = noop;
        server.listen(address);
    };

    isSocket(address, function(err, isSocket) {
        // are we bound to unix domain socket?
        if (!isSocket) {
            return debuglog("Nothing to do, we are not a UNIX domain socket server.");
        }

        // try to connect to the socket to test if orphaned
        const client = net.createConnection(address);
        client.once("connect", function() {
            client.end();

            // invoke listen so error propagates
            return listen();
        });

        client.once("error", function(err) {
            client.end();

            if ("ECONNREFUSED" !== err.code) {
                // invoke listen so error propagates
                return listen();
            }

            // retry on connection refused
            debuglog("retry %s after unlinking", address);
            fs.unlink(address, listen);
        });
    });
}

/**
 * Error callback for net.Server.listen. If specified path
 * is already in use then check if it an orphaned socket.
 *
 * @param {Error} err - Connection error
 * @this {net.Server}
 * @private
 */
function retryIfAddressInUse(err) {
    /*jshint validthis: true */
    if ("EADDRINUSE" === err.code) {
        retryIfOrphaned(this);
    }
}

/**
 * Makes provided UNIX domain socket server proxiable.
 *
 * @param {net.Server} server - UNIX domain socket server
 * @returns {net.Server}
 */
module.exports = exports = function(server) {
    if (!(server instanceof net.Server)) {
        debuglog("Invalid argument: 'server' is not a net.Server.");
        return server;
    }

    // chmod our unix domain socket so it can be proxied
    server.once("listening", function() {
        this.removeListener("error", retryIfAddressInUse);
        setReadWritable(this);
    });

    // retry only if EADDRINUSE
    server.once("error", retryIfAddressInUse);

    return server;
};

/**
 * If we are clustered we need to do a more manual cleanup
 */
if (cluster.isMaster) {
    cluster.once("listening", function(worker, address) {
        // unlink our unix domain socket
        if (-1 === address.addressType) {
            isSocket(address.address, function(err, isSocket) {
                if (isSocket) {
                    process.on("exit", () => fs.unlink(address.address, noop));
                }
            });
        }
    });
}