"use strict";

const express = require("express");
const http = require("http");
const proxiable = require("../proxiable");
const sock = module.filename.slice(0, -2) + "sock";

// Setup signal handlers so process exit event can be triggered
[ "SIGINT", "SIGTERM", "SIGHUP" ].forEach(signal => process.on(signal, process.exit));

// Terminate with core dump
process.on("SIGQUIT", process.abort);

const app = express();
const server = http.createServer(app);

app.get("/", function(req, res) {
    res.send("Hello World!");
});

proxiable(server).listen(sock);