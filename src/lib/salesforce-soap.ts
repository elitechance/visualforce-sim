import fs = require('fs');
import util = require("util");
import http = require('https');
import Base from "./base";

export default class SalesforceSoap extends Base {
    private _sessionId:string;
    private _filterScript:string;
    private _instanceUrl:string;
    private _version:string;

    public getExecuteAnonymousEnvelope() {
        let filterFile = [__dirname,'..','templates', 'execute-anonymous.xml'].join('/');
        return fs.readFileSync(filterFile, 'utf8');
    }

    public getFilter():string {
        if (this.filterScript) {
            return this.filterScript;
        }
        else {
            let filterFile = [__dirname,'..','templates', 'filter-response.txt'].join('/');
            return fs.readFileSync(filterFile, 'utf8');
        }
    }

    public getSerializer():string {
        let filterFile = [__dirname,'..','templates', 'anonymous-serializer.txt'].join('/');
        return fs.readFileSync(filterFile, 'utf8');
    }

    private getFunctionPayload(className:string, functionName:string, args) {
        args = args.map(param => {
            if (typeof param == 'string') {
                return "'"+param+"'";
            }
            return param;
        });
        return className+"."+functionName+"("+args.join(',')+")";
    }

    private getEndpointPath() {
        return ['services/Soap/s', this.version].join('/');
    }

    private getEndpointPort() {
        let endpoint = this.getEndpoint();
        if (endpoint.startsWith("http:")) { return 80 }
        return 443;
    }

    private getEndpoint() {
        return [this.instanceUrl, this.getEndpointPath()].join('/');
    }

    private getAnonymousScript(functionPayload:string) {
        let filter = this.getFilter();
        let serializer = this.getSerializer();
        let payload = [filter,serializer].join("\n");
        return util.format(payload, functionPayload);
    }

    private parseExecuteAnonymous(functionPayload:string):string {
        let anonymousExecuteTemplate = this.getExecuteAnonymousEnvelope();
        let anonymousScript = this.getAnonymousScript(functionPayload);
        return util.format(anonymousExecuteTemplate, this.sessionId, anonymousScript);
    }

    private parseResponseJson(data:string) {
        let Entities = require('html-entities').AllHtmlEntities;
        let entities = new Entities();
        let matches = data.match(/DEBUG\|VISUALFORCE_SIM(.*)/);
        if (!matches || matches.length <= 0) return [];
        let jsonLine = matches[0];
        jsonLine = jsonLine.replace('DEBUG|VISUALFORCE_SIM&amp;#124;', '');
        let node = JSON.parse(entities.decode(jsonLine));
        if (node instanceof Array) {
            node = node.map(property => {
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
    }

    public execute(className:string, functionName:string, args:any[], callback:Function) {
        let functionPayload = this.getFunctionPayload(className, functionName, args);
        let executeAnonymousPayload = this.parseExecuteAnonymous(functionPayload);
        let options = {
            method:'POST',
            host:this._instanceUrl.replace('http://', '').replace('https://',''),
            port: this.getEndpointPort(),
            path: '/'+this.getEndpointPath(),
            headers: {
                'content-type':'text/xml',
                'SOAPAction': 'action'
            }
        };
        let responseData = '';
        let request = http.request(options, (response) => {
            response.on('data', (data) =>{
                responseData += data;
            });
            response.on('end', () =>{
                this.logger("Invoke", functionPayload);
                this.logger("XML response", responseData);
                callback(null, this.parseResponseJson(responseData));
            });
            response.on('error', (error) =>{
                this.logger("Invoke", functionPayload);
                this.logger("XML request error", error);
                callback(error, null);
            })
        });
        request.write(executeAnonymousPayload);
        request.end();
    }

    get sessionId(): string {
        return this._sessionId;
    }

    set sessionId(value: string) {
        this._sessionId = value;
    }

    get filterScript(): string {
        return this._filterScript;
    }

    set filterScript(value: string) {
        this._filterScript = value;
    }

    get instanceUrl(): string {
        return this._instanceUrl;
    }

    set instanceUrl(value: string) {
        this._instanceUrl = value;
    }

    get version(): string {
        return this._version;
    }

    set version(value: string) {
        this._version = value;
    }
}