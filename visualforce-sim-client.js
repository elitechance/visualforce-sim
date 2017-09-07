/**
 * Created by EGomez on 7/17/17.
 */
var Manager = (function () {
    function Manager() {
        this._serverApiBasePath = '';
    }
    Object.defineProperty(Manager.prototype, "serverApiBasePath", {
        get: function () {
            return this._serverApiBasePath;
        },
        set: function (value) {
            this._serverApiBasePath = value;
        },
        enumerable: true,
        configurable: true
    });
    Manager.prototype.request = function (args, callback) {
        $.ajax({
            type: 'POST',
            url: this.serverApiBasePath + '/apex/remote',
            data: JSON.stringify(args),
            contentType: 'application/json',
            success: function (data) {
                callback(data);
            }
        });
    };
    Manager.prototype.invokeAction = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        setTimeout(function () {
            var controller = args[0];
            var length = args.length;
            var callback;
            var options;
            var lastArgument = args[length - 1];
            switch (typeof lastArgument) {
                case 'object':
                    callback = args[length - 2];
                    options = lastArgument;
                    break;
                case 'function':
                    callback = lastArgument;
                    break;
            }
            _this.request(args, callback);
        }, 10);
    };
    return Manager;
}());
var Remoting = (function () {
    function Remoting() {
        this.Manager = new Manager();
    }
    return Remoting;
}());
var Visualforce = (function () {
    function Visualforce() {
    }
    Visualforce.remoting = new Remoting();
    return Visualforce;
}());
(function (Visualforce) {
    if (!window.Visualforce) {
        window.Visualforce = Visualforce;
    }
})(new Visualforce());
//# sourceMappingURL=visualforce-sim-client.js.map