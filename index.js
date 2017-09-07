#!/usr/bin/env node
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var bodyParser = require("body-parser");
var commander = require("commander");
var salesForce = require("jsforce");
var salesforce_soap_1 = require("./lib/salesforce-soap");
var fs = require("fs");
var cheerio = require("cheerio");
var interceptor = require("express-interceptor");
var base_1 = require("./lib/base");
var WebServer = (function (_super) {
    __extends(WebServer, _super);
    function WebServer() {
        var _this = _super.call(this) || this;
        _this._express = express();
        _this._saleforceSoap = new salesforce_soap_1.default();
        _this._isLive = false;
        _this.initCommander();
        _this.setupServer();
        return _this;
    }
    WebServer.prototype.initCommander = function () {
        commander
            .option('-l, --live', 'Use Salesforce @RemoteAction methods. This will read from SF_PASSWORD, \n' +
            '\t\t\t\tSF_USERNAME, and SF_INSTANCE environment variables for credentials')
            .option('-f, --filter <file>', 'Set custom filter implementation')
            .option('-s, --show-filter', 'Show default implementation of filter')
            .option('-w, --watch-files', 'Watch changes and reload browser')
            .option('-v, --verbose', 'Display info logs')
            .option('-x, --salesforce-verbose', 'Display Salesforce request logs')
            .parse(process.argv);
    };
    WebServer.prototype.setCustomFilter = function (fileName) {
        try {
            this._saleforceSoap.filterScript = fs.readFileSync(fileName, 'utf8');
        }
        catch (error) {
            this.errorMessage(error.message);
        }
    };
    WebServer.prototype.setupServer = function () {
        var isLive = commander['live'];
        var showFilter = commander['showFilter'];
        var customerFilter = commander['filter'];
        this.watchFiles = commander['watchFiles'];
        this.verbose = commander['verbose'];
        if (showFilter) {
            this.showFilter();
            return;
        }
        if (customerFilter) {
            this.setCustomFilter(customerFilter);
        }
        if (isLive) {
            this._isLive = true;
            this._saleforceSoap.verbose = commander['salesforceVerbose'];
            this.salesforceLogin();
        }
        else {
            this.initWebServer();
        }
    };
    WebServer.prototype.showFilter = function () {
        console.log("");
        console.log(this._saleforceSoap.getFilter());
        process.exit(0);
    };
    WebServer.prototype.showSerializer = function () {
        console.log("");
        console.log(this._saleforceSoap.getSerializer());
        process.exit(0);
    };
    WebServer.prototype.interceptHtml = function (request, response) {
        return {
            isInterceptable: function () {
                return true;
            },
            intercept: function (body, send) {
                if (body.match(/<html/) != null && body.trim().match(/<\/html>$/) != null) {
                    var $document = cheerio.load(body);
                    var watcherScript = fs.readFileSync(__dirname + '/watcher.js');
                    $document('body').append('<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.js"></script>');
                    $document('body').append('<script>' + watcherScript + '</script>');
                    send($document.html());
                }
                else {
                    send(body);
                }
            }
        };
    };
    WebServer.prototype.reloadWebApp = function () {
        var socket;
        for (var socketId in this.io.sockets.connected) {
            socket = this.io.sockets.connected[socketId];
            socket.emit('reload', true);
        }
    };
    WebServer.prototype.setupWatchFiles = function () {
        var _this = this;
        var chokidar = require('chokidar');
        chokidar.watch(process.cwd(), { ignored: /(node_modules|\/\.)/ }).on('all', function (event, path) {
            if (event != 'add' && event != 'addDir') {
                _this.logger("Reload Web App", event, path);
                _this.reloadWebApp();
            }
        });
    };
    WebServer.prototype.initWebServer = function () {
        var _this = this;
        var port = process.env['PORT'] || 3000;
        var server = require('http').Server(this.express);
        this.io = require('socket.io')(server);
        server.listen(port, function () {
            console.log("Running on port:", port);
            _this.express.use(bodyParser.json());
            _this.express.use(cors());
            if (_this.watchFiles) {
                console.log("Watch files enabled");
                _this.express.use(interceptor(_this.interceptHtml));
                _this.setupWatchFiles();
            }
            _this.express.use("/", express.static(process.cwd()));
            if (_this._isLive) {
                _this.express.post("/apex/remote", function (req, res) { _this.apexRemoteLive(req, res); });
            }
            else {
                _this.express.post("/apex/remote", function (req, res) { _this.apexRemote(req, res); });
            }
        });
    };
    WebServer.prototype.errorMessage = function (message) {
        console.log(message);
        process.exit(1);
    };
    WebServer.prototype.logger = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.verbose) {
            console.log.apply(this, args);
        }
    };
    WebServer.prototype.salesforceLogin = function () {
        var _this = this;
        var instance = process.env['SF_INSTANCE'];
        var username = process.env['SF_USERNAME'];
        var password = process.env['SF_PASSWORD'];
        if (!instance) {
            instance = 'https://login.salesforce.com';
        }
        var connection = new salesForce.Connection({ loginUrl: instance });
        this.logger("Logging in to Salesforce");
        connection.login(username, password, function (error, userInfo) {
            if (error) {
                _this.errorMessage(error);
            }
            _this._connection = connection;
            _this._saleforceSoap.sessionId = _this._connection.accessToken;
            _this._saleforceSoap.instanceUrl = _this._connection.instanceUrl;
            _this._saleforceSoap.version = _this._connection.version;
            _this.logger("Login success");
            _this.logger("  Session ID: ", _this._connection.accessToken);
            _this.logger("  Instance URL: ", _this._connection.instanceUrl);
            _this.logger("  Version: ", _this._connection.version);
            _this.initWebServer();
        });
    };
    WebServer.prototype.searchCache = function (moduleName, callback) {
        // Resolve the module identified by the specified name
        var mod = require.resolve(moduleName);
        // Check if the module has been resolved and fourd within
        // the cache
        if (mod && ((mod = require.cache[mod]) !== undefined)) {
            // Recursively go over the results
            (function traverse(mod) {
                // Go over each of the module's children and
                // traverse them
                mod['children'].forEach(function (child) {
                    traverse(child);
                });
                // Call the specified callback providing the
                // found cached module
                callback(mod);
            }(mod));
        }
    };
    WebServer.prototype.purgeCache = function (moduleName) {
        this.searchCache(moduleName, function (mod) {
            delete require.cache[mod.id];
        });
        Object.keys(module.constructor['_pathCache']).forEach(function (cacheKey) {
            if (cacheKey.indexOf(moduleName) > 0) {
                delete module.constructor['_pathCache'][cacheKey];
            }
        });
    };
    WebServer.prototype.getParamsFromRequest = function (args) {
        args.splice(0, 1); // remove method name
        var length = args.length;
        if (args[length - 1] === null) {
            args.splice(args.length - 1, 1); // remove callback
        }
        else {
            args.splice(args.length - 1, 1); // remove options
            args.splice(args.length - 1, 1); // remove callback
        }
        return args;
    };
    WebServer.prototype.executeMethod = function (instance, functionName, args) {
        args = this.getParamsFromRequest(args);
        return instance[functionName].apply(instance, args);
    };
    WebServer.prototype.apexRemote = function (request, response) {
        var controller = request.body[0];
        var controllerInfo = controller.split('.');
        var className = controllerInfo[0];
        var functionName = controllerInfo[1];
        var moduleName = process.cwd() + "/apex-remote/" + className;
        this.purgeCache(moduleName);
        var module = require(moduleName).default;
        if (module) {
            var instance = new module();
            if (instance && instance[functionName]) {
                response.send(this.executeMethod(instance, functionName, request.body));
            }
            else {
                response.send([]);
            }
        }
        else {
            response.send([]);
        }
    };
    WebServer.prototype.apexRemoteLive = function (request, response) {
        var args = request.body;
        var controller = args[0];
        var controllerInfo = controller.split('.');
        var className = controllerInfo[0];
        var functionName = controllerInfo[1];
        args = this.getParamsFromRequest(args);
        this._saleforceSoap.execute(className, functionName, args, function (error, res) {
            if (error) {
                response.send(error);
            }
            else {
                response.send(res);
            }
        });
    };
    Object.defineProperty(WebServer.prototype, "express", {
        get: function () {
            return this._express;
        },
        set: function (value) {
            this._express = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebServer.prototype, "io", {
        get: function () {
            return this._io;
        },
        set: function (value) {
            this._io = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebServer.prototype, "watchFiles", {
        get: function () {
            return this._watchFiles;
        },
        set: function (value) {
            this._watchFiles = value;
        },
        enumerable: true,
        configurable: true
    });
    return WebServer;
}(base_1.default));
var webServer = new WebServer();
//# sourceMappingURL=index.js.map