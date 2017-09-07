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
var fs = require("fs");
var util = require("util");
var http = require("https");
var base_1 = require("./base");
var SalesforceSoap = (function (_super) {
    __extends(SalesforceSoap, _super);
    function SalesforceSoap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SalesforceSoap.prototype.getExecuteAnonymousEnvelope = function () {
        var filterFile = [__dirname, '..', 'templates', 'execute-anonymous.xml'].join('/');
        return fs.readFileSync(filterFile, 'utf8');
    };
    SalesforceSoap.prototype.getFilter = function () {
        if (this.filterScript) {
            return this.filterScript;
        }
        else {
            var filterFile = [__dirname, '..', 'templates', 'filter-response.txt'].join('/');
            return fs.readFileSync(filterFile, 'utf8');
        }
    };
    SalesforceSoap.prototype.getSerializer = function () {
        var filterFile = [__dirname, '..', 'templates', 'anonymous-serializer.txt'].join('/');
        return fs.readFileSync(filterFile, 'utf8');
    };
    SalesforceSoap.prototype.getFunctionPayload = function (className, functionName, args) {
        args = args.map(function (param) {
            if (typeof param == 'string') {
                return "'" + param + "'";
            }
            return param;
        });
        return className + "." + functionName + "(" + args.join(',') + ")";
    };
    SalesforceSoap.prototype.getEndpointPath = function () {
        return ['services/Soap/s', this.version].join('/');
    };
    SalesforceSoap.prototype.getEndpointPort = function () {
        var endpoint = this.getEndpoint();
        if (endpoint.startsWith("http:")) {
            return 80;
        }
        return 443;
    };
    SalesforceSoap.prototype.getEndpoint = function () {
        return [this.instanceUrl, this.getEndpointPath()].join('/');
    };
    SalesforceSoap.prototype.getAnonymousScript = function (functionPayload) {
        var filter = this.getFilter();
        var serializer = this.getSerializer();
        var payload = [filter, serializer].join("\n");
        return util.format(payload, functionPayload);
    };
    SalesforceSoap.prototype.parseExecuteAnonymous = function (functionPayload) {
        var anonymousExecuteTemplate = this.getExecuteAnonymousEnvelope();
        var anonymousScript = this.getAnonymousScript(functionPayload);
        return util.format(anonymousExecuteTemplate, this.sessionId, anonymousScript);
    };
    SalesforceSoap.prototype.parseResponseJson = function (data) {
        var Entities = require('html-entities').AllHtmlEntities;
        var entities = new Entities();
        var matches = data.match(/DEBUG\|VISUALFORCE_SIM(.*)/);
        if (!matches || matches.length <= 0)
            return [];
        var jsonLine = matches[0];
        jsonLine = jsonLine.replace('DEBUG|VISUALFORCE_SIM&amp;#124;', '');
        jsonLine = Buffer.from(jsonLine, "base64").toString("utf8");
        var node = JSON.parse(jsonLine);
        if (node instanceof Array) {
            node = node.map(function (property) {
                if (property['attributes']) {
                    delete property['attributes'];
                }
                return property;
            });
        }
        else {
            if (node['attributes']) {
                delete node['attributes'];
            }
        }
        return node;
    };
    SalesforceSoap.prototype.execute = function (className, functionName, args, callback) {
        var _this = this;
        var functionPayload = this.getFunctionPayload(className, functionName, args);
        var executeAnonymousPayload = this.parseExecuteAnonymous(functionPayload);
        var options = {
            method: 'POST',
            host: this._instanceUrl.replace('http://', '').replace('https://', ''),
            port: this.getEndpointPort(),
            path: '/' + this.getEndpointPath(),
            headers: {
                'content-type': 'text/xml',
                'SOAPAction': 'action'
            }
        };
        var responseData = '';
        var request = http.request(options, function (response) {
            response.on('data', function (data) {
                responseData += data;
            });
            response.on('end', function () {
                _this.logger("Invoke", functionPayload);
                _this.logger("XML response", responseData);
                callback(null, _this.parseResponseJson(responseData));
            });
            response.on('error', function (error) {
                _this.logger("Invoke", functionPayload);
                _this.logger("XML request error", error);
                callback(error, null);
            });
        });
        request.write(executeAnonymousPayload);
        request.end();
    };
    Object.defineProperty(SalesforceSoap.prototype, "sessionId", {
        get: function () {
            return this._sessionId;
        },
        set: function (value) {
            this._sessionId = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SalesforceSoap.prototype, "filterScript", {
        get: function () {
            return this._filterScript;
        },
        set: function (value) {
            this._filterScript = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SalesforceSoap.prototype, "instanceUrl", {
        get: function () {
            return this._instanceUrl;
        },
        set: function (value) {
            this._instanceUrl = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SalesforceSoap.prototype, "version", {
        get: function () {
            return this._version;
        },
        set: function (value) {
            this._version = value;
        },
        enumerable: true,
        configurable: true
    });
    return SalesforceSoap;
}(base_1.default));
exports.default = SalesforceSoap;
//# sourceMappingURL=salesforce-soap.js.map