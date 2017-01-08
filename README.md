# proxiable

Copyright (c) 2017 Michael Welter <michael@yammm.com>

## About

Makes a UNIX domain socket server proxiable and helps Node cleanup after itself.

Performs the below tasks:

1. On server listening will chmod the socket file to 666 to allow proxying from another process.
2. On process exit ensure server.close is called so our UNIX domain socket is unlinked.

## Install

    $ npm install --save proxiable

## Usage

### HTTP/HTTPS

```javascript

// Setup signal handlers so process exit event can be triggered
[ "SIGINT", "SIGTERM" ].forEach(signal => process.on(signal, process.exit));

require("proxiable")("/var/run/example.pid");
```

### Express

```javascript

// Setup signal handlers so process exit event can be triggered
[ "SIGINT", "SIGTERM" ].forEach(signal => process.on(signal, process.exit));

require("proxiable")("/var/run/example.pid");
```

## Debug

NODE_DEBUG=proxiable