"use strict";

const http = require("http");
const proxiable = require("../proxiable");
const sock = module.filename.slice(0, -2) + "sock";

// Setup signal handlers so process exit event can be triggered
[ "SIGINT", "SIGTERM", "SIGHUP" ].forEach(signal => process.on(signal, process.exit));

// Terminate with core dump
process.on("SIGQUIT", process.abort);

const server = http.createServer((req, res) => {
    res.end();
});

server.on("clientError", (err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

proxiable(server).listen(sock);