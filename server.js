var connect = require('connect'),
    serveStatic = require('serve-static'),
    open = require('open'),
    fileSystem = require('fs'),
    path = require('path');

connect()
    .use(serveStatic(__dirname))
    .listen(8080, function () { open('http://localhost:8080/') });
