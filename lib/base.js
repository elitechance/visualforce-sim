"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Base = (function () {
    function Base() {
    }
    Base.prototype.logger = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.verbose) {
            console.log.apply(this, args);
        }
    };
    Object.defineProperty(Base.prototype, "verbose", {
        get: function () {
            return this._verbose;
        },
        set: function (value) {
            this._verbose = value;
        },
        enumerable: true,
        configurable: true
    });
    return Base;
}());
exports.default = Base;
//# sourceMappingURL=base.js.map