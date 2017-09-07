#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var commander = require("commander");
/**
 * Created by EGomez on 7/17/17.
 */
var ApexParser = (function () {
    function ApexParser() {
        this.initCommander();
        this.processRequest();
    }
    ApexParser.prototype.errorMessage = function (message) {
        console.log(message + "\n");
        process.exit(1);
    };
    ApexParser.prototype.processRequest = function () {
        this.fileName = commander['file'];
        if (this.fileName) {
            this.processFile();
        }
        else {
            this.processClipboard();
        }
    };
    ApexParser.prototype.processClipboard = function () {
        var clipboard = require('clipboardy');
        try {
            this.printClass(JSON.parse(clipboard.readSync()));
        }
        catch (error) {
            this.errorMessage(error);
        }
    };
    ApexParser.prototype.printClass = function (jsonObject) {
        var json = require('format-json');
        console.log("export default class " + jsonObject[0].action + " {\n");
        for (var _i = 0, jsonObject_1 = jsonObject; _i < jsonObject_1.length; _i++) {
            var response = jsonObject_1[_i];
            console.log("    " + response.method + "() {");
            console.log("        return " + json.terse(response.result) + ";");
            console.log("    }");
        }
        console.log("}");
    };
    ApexParser.prototype.processFile = function () {
        try {
            var fs = require('fs');
            var jsonStringResponse = fs.readFileSync(this.fileName, 'utf8');
            var jsonResponse = JSON.parse(jsonStringResponse);
            this.printClass(jsonResponse);
        }
        catch (error) {
            this.errorMessage(error);
        }
    };
    ApexParser.prototype.initCommander = function () {
        commander
            .option('-f, --file <file>', 'JSON file')
            .parse(process.argv);
    };
    return ApexParser;
}());
var apexParser = new ApexParser();
//# sourceMappingURL=apex-parser.js.map