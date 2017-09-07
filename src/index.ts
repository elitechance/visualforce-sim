#!/usr/bin/env node

/**
 * Created by EGomez on 7/17/17.
 */

import express =  require('express');
import cors = require('cors');
import {Express, Request, Response} from "express";
import bodyParser = require("body-parser");
import commander = require("commander");
import salesForce = require('jsforce');
import SalesforceSoap from "./lib/salesforce-soap";
import fs = require('fs');
import cheerio = require('cheerio');
import interceptor = require('express-interceptor');
import Base from "./lib/base";

class WebServer extends Base {
    private _express = express();
    private _connection;
    private _saleforceSoap:SalesforceSoap = new SalesforceSoap();
    private _isLive:boolean = false;
    private _io:any;
    private _watchFiles:boolean;

    constructor() {
        super();
        this.initCommander();
        this.setupServer();
    }

    private initCommander() {
        commander
            .option('-l, --live', 'Use Salesforce @RemoteAction methods. This will read from SF_PASSWORD, \n' +
                '\t\t\t\tSF_USERNAME, and SF_INSTANCE environment variables for credentials')
            .option('-f, --filter <file>', 'Set custom filter implementation')
            .option('-s, --show-filter', 'Show default implementation of filter')
            .option('-w, --watch-files', 'Watch changes and reload browser')
            .option('-v, --verbose', 'Display info logs')
            .option('-x, --salesforce-verbose', 'Display Salesforce request logs')
            .parse(process.argv);
    }

    private setCustomFilter(fileName:string) {
        try {
            this._saleforceSoap.filterScript = fs.readFileSync(fileName, 'utf8');
        }
        catch (error) {
            this.errorMessage(error.message);
        }
    }

    private setupServer() {
        let isLive = commander['live'];
        let showFilter = commander['showFilter'];
        let customerFilter = commander['filter'];
        this.watchFiles = commander['watchFiles'];
        this.verbose = commander['verbose'];
        if (showFilter) { this.showFilter(); return; }
        if (customerFilter) {this.setCustomFilter(customerFilter);}

        if (isLive) {
            this._isLive = true;
            this._saleforceSoap.verbose = commander['salesforceVerbose'];
            this.salesforceLogin();
        }
        else {
            this.initWebServer();
        }
    }

    private showFilter() {
        console.log("");
        console.log(this._saleforceSoap.getFilter());
        process.exit(0);
    }

    private showSerializer() {
        console.log("");
        console.log(this._saleforceSoap.getSerializer());
        process.exit(0);
    }

    private interceptHtml(request, response) {
        return {
            isInterceptable: function () {
                return true;
            },
            intercept: (body, send) => {
                if (body.match(/<html/) != null && body.trim().match(/<\/html>$/) != null) {
                    let $document = cheerio.load(body);
                    let watcherScript = fs.readFileSync(__dirname+'/watcher.js');
                    $document('body').append('<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.js"></script>');
                    $document('body').append('<script>'+watcherScript+'</script>');
                    send($document.html());
                }
                else {
                    send(body);
                }
            }
        }
    }

    private reloadWebApp() {
        let socket;
        for (let socketId in this.io.sockets.connected) {
            socket = this.io.sockets.connected[socketId];
            socket.emit('reload', true);
        }
    }

    private setupWatchFiles() {
        let chokidar = require('chokidar');
        chokidar.watch(process.cwd(), {ignored: /(node_modules|\/\.)/}).on('all', (event, path) => {
            if (event != 'add' && event != 'addDir') {
                this.logger("Reload Web App", event, path);
                this.reloadWebApp();
            }
        });

    }

    initWebServer() {
        let port = process.env['PORT'] || 3000;
        let server = require('http').Server(this.express);
        this.io = require('socket.io')(server);

        server.listen(port, () =>{
            console.log("Running on port:", port);
            this.express.use(bodyParser.json());
            this.express.use(cors());

            if (this.watchFiles) {
                console.log("Watch files enabled");
                this.express.use(interceptor(this.interceptHtml));
                this.setupWatchFiles();
            }

            this.express.use("/", express.static(process.cwd()));
            if (this._isLive) {
                this.express.post("/apex/remote", (req, res) =>{ this.apexRemoteLive(req, res); });
            }
            else {
                this.express.post("/apex/remote", (req, res) =>{ this.apexRemote(req, res); });
            }

        });
    }

    private errorMessage(message) {
        console.log(message);
        process.exit(1);
    }

    protected logger(...args) {
        if (this.verbose) {
            console.log.apply(this, args);
        }
    }

    private salesforceLogin() {
        let instance = process.env['SF_INSTANCE'];
        let username = process.env['SF_USERNAME'];
        let password = process.env['SF_PASSWORD'];
        if (!instance) { instance = 'https://login.salesforce.com'; }

        let connection = new salesForce.Connection({ loginUrl : instance });
        this.logger("Logging in to Salesforce");
        connection.login(username, password, (error, userInfo) => {
            if (error) { this.errorMessage(error); }
            this._connection = connection;
            this._saleforceSoap.sessionId = this._connection.accessToken;
            this._saleforceSoap.instanceUrl = this._connection.instanceUrl;
            this._saleforceSoap.version = this._connection.version;
            this.logger("Login success");
            this.logger("  Session ID: ", this._connection.accessToken);
            this.logger("  Instance URL: ", this._connection.instanceUrl);
            this.logger("  Version: ", this._connection.version);
            this.initWebServer();
        });
    }

    private searchCache(moduleName, callback:Function) {
        // Resolve the module identified by the specified name
        let mod = require.resolve(moduleName);

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
    }

    private purgeCache(moduleName:string) {
        this.searchCache(moduleName, function (mod) {
            delete require.cache[mod.id];
        });

        Object.keys(module.constructor['_pathCache']).forEach(function(cacheKey) {
            if (cacheKey.indexOf(moduleName)>0) {
                delete module.constructor['_pathCache'][cacheKey];
            }
        });
    }

    private getParamsFromRequest(args:any[]) {
        args.splice(0,1); // remove method name
        let length = args.length;
        if (args[length-1] === null) {
            args.splice(args.length-1, 1); // remove callback
        }
        else {
            args.splice(args.length-1,1); // remove options
            args.splice(args.length-1,1); // remove callback
        }
        return args;
    }

    private executeMethod(instance:any, functionName:string, args:string[]) {
        args = this.getParamsFromRequest(args);
        return instance[functionName].apply(instance, args);
    }

    private apexRemote(request:Request, response:Response) {
        let controller = request.body[0];
        let controllerInfo = controller.split('.');
        let className = controllerInfo[0];
        let functionName = controllerInfo[1];
        let moduleName = process.cwd()+"/apex-remote/"+className;

        this.purgeCache(moduleName);
        let module = require(moduleName).default;
        if (module) {
            let instance = new module();
            if (instance && instance[functionName])  {
                response.send(this.executeMethod(instance, functionName, request.body));
            }
            else {
                response.send([]);
            }
        }
        else {
            response.send([]);
        }
    }

    private apexRemoteLive(request:Request, response:Response) {
        let args = request.body;
        let controller = args[0];
        let controllerInfo = controller.split('.');
        let className = controllerInfo[0];
        let functionName = controllerInfo[1];
        args = this.getParamsFromRequest(args);
        this._saleforceSoap.execute(className, functionName, args, (error, res) =>{
            if (error) {
                response.send(error);
            }
            else {
                response.send(res);
            }
        });
    }

    get express(): Express {
        return this._express;
    }

    set express(value: Express) {
        this._express = value;
    }

    get io(): any {
        return this._io;
    }

    set io(value: any) {
        this._io = value;
    }

    get watchFiles(): boolean {
        return this._watchFiles;
    }

    set watchFiles(value: boolean) {
        this._watchFiles = value;
    }

}

let webServer = new WebServer();