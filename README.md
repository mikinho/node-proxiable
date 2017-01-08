# proxiable

Copyright (c) 2017 Michael Welter <michael@yammm.com>

## About

Makes a UNIX domain socket server proxiable and helps Node cleanup after itself.

Performs the below tasks:

1. On server listening will chmod the socket file to 666 to allow proxying from another process.
2. On process exit ensure server.close is called so our UNIX domain socket is unlinked.
3. If specified UNIX domain socket path already exists check if it is an orphaned and if so, unlink it.

## Install

    $ npm install --save proxiable

## Usage

### HTTP/HTTPS

```javascript
const http = require("http");
const proxiable = require("../proxiable");

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

proxiable(server).listen("/var/run/example.sock");
```

### Express

```javascript
const express = require("express");
const http = require("http");
const proxiable = require("proxiable");

// Setup signal handlers so process exit event can be triggered
[ "SIGINT", "SIGTERM", "SIGHUP" ].forEach(signal => process.on(signal, process.exit));

// Terminate with core dump
process.on("SIGQUIT", process.abort);

const app = express();
const server = http.createServer(app);

app.get("/", function(req, res) {
    res.send("Hello World!");
});

proxiable(server).listen("/var/run/example.sock");
```

## Debug

NODE_DEBUG=proxiable