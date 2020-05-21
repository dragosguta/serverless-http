"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerlessError = void 0;
class ServerlessError extends Error {
    constructor(opts) {
        var _a;
        super(opts.message);
        this.message = opts.message;
        this.context = (_a = opts.context) !== null && _a !== void 0 ? _a : null;
    }
    toString() {
        return this.message;
    }
    toJSON() {
        return JSON.stringify({
            message: this.message,
            context: this.context,
        });
    }
}
exports.ServerlessError = ServerlessError;
