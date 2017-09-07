/**
 * Created by EGomez on 7/17/17.
 */
var Watcher = (function () {
    function Watcher() {
        this._socket = io();
        this.setupWatchers();
    }
    Watcher.prototype.setupWatchers = function () {
        this.socket.on('reload', function (data) {
            location.reload(true);
        });
    };
    Object.defineProperty(Watcher.prototype, "socket", {
        get: function () {
            return this._socket;
        },
        set: function (value) {
            this._socket = value;
        },
        enumerable: true,
        configurable: true
    });
    return Watcher;
}());
(function (Watcher) {
    if (!window.Watcher) {
        window.Watcher = Watcher;
    }
})(new Watcher());
//# sourceMappingURL=watcher.js.map