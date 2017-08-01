/**
 * Created by EGomez on 7/17/17.
 */

declare let io:any;

class Watcher {
    private _socket = io();
    constructor() {
        this.setupWatchers();
    }

    private setupWatchers() {
        this.socket.on('reload', (data) => {
            location.reload(true);
        });
    }

    get socket(): any {
        return this._socket;
    }

    set socket(value: any) {
        this._socket = value;
    }
}

(function (Watcher) {
    if (!(<any>window).Watcher) {
        (<any>window).Watcher = Watcher;
    }
})(new Watcher());
