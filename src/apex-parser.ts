#!/usr/bin/env node

import commander = require('commander');

/**
 * Created by EGomez on 7/17/17.
 */

class ApexParser {

    private fileName;

    constructor() {
        this.initCommander();
        this.processRequest();
    }

    errorMessage(message:string) {
        console.log(message+"\n");
        process.exit(1);
    }

    processRequest() {
        this.fileName = commander['file'];
        if (this.fileName) {
            this.processFile();
        }
        else {
            this.processClipboard();
        }
    }

    private processClipboard() {
        let clipboard = require('clipboardy');
        try {
            this.printClass(JSON.parse(clipboard.readSync()));
        }
        catch (error) {
            this.errorMessage(error);
        }
    }

    private printClass(jsonObject) {
        let json = require('format-json');
        console.log("export default class "+jsonObject[0].action+" {\n");
        for (let response of jsonObject) {
            console.log("    "+response.method+"() {");
            console.log("        return " + json.terse(response.result)+";");
            console.log("    }");
        }
        console.log("}");
    }

    private processFile() {
        try {
            let fs = require('fs');
            let jsonStringResponse = fs.readFileSync(this.fileName, 'utf8');
            let jsonResponse = JSON.parse(jsonStringResponse);
            this.printClass(jsonResponse);

        }
        catch (error) {
            this.errorMessage(error);
        }
    }

    initCommander() {
        commander
            .option('-f, --file <file>', 'JSON file')
            .parse(process.argv);
    }
}

let apexParser = new ApexParser();