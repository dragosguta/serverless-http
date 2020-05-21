"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerlessFactory = void 0;
const url_1 = __importDefault(require("url"));
const stream_1 = require("stream");
const http_1 = require("http");
const utilities_1 = require("utilities");
const error_1 = require("../util/error");
const set_cookie_json_1 = require("./set-cookie.json");
class ServerlessFactory {
    constructor(event, opts) {
        var _a, _b, _c;
        this.$framework = null;
        this.$request = null;
        this.$response = null;
        this.$body = [];
        this._headerBreak = '\r\n\r\n';
        this._wroteHeader = false;
        const { cf: { request, config }, } = event.Records[0];
        this.requestHeaders = Object.keys(request.headers).reduce((accum, header) => {
            const group = request.headers[header];
            accum[header.toLowerCase()] = group[group.length - 1].value;
            return accum;
        }, {});
        if (opts === null || opts === void 0 ? void 0 : opts.requestId) {
            this.requestHeaders[opts.requestId.toLowerCase()] = config.requestId;
        }
        this.requestBody = Buffer.from((_b = (_a = request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : '', ((_c = request.body) === null || _c === void 0 ? void 0 : _c.encoding) === 'base64' ? 'base64' : 'utf8');
        this.method = request.method;
        this.path = request.uri;
        this.ip = request.clientIp;
        this.url = url_1.default.format({
            pathname: request.uri,
            search: request.querystring,
        });
    }
    /**
     * @todo fix type casting
     * @todo fix possibly empty string for header
     */
    sanitizeHeaders(headers) {
        return Object.keys(headers).reduce((accum, key) => {
            var _a, _b, _c, _d;
            if (Array.isArray(headers[key])) {
                if (key.toLowerCase() === 'set-cookie') {
                    (_a = headers[key]) === null || _a === void 0 ? void 0 : _a.forEach((cookie, index) => {
                        accum[set_cookie_json_1.variations[index]] = cookie;
                    });
                }
                else {
                    accum[key] = (_b = headers[key]) === null || _b === void 0 ? void 0 : _b.join(', ');
                }
            }
            else {
                accum[key] = (_d = (_c = headers[key]) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : '';
            }
            return accum;
        }, {});
    }
    get request() {
        return this.$request;
    }
    get response() {
        return this.$response;
    }
    loadFramework(app) {
        /** Koa */
        if (typeof app.callback === 'function') {
            this.$framework = app.callback();
            return this;
        }
        /** ExpressJS */
        if (typeof app === 'function') {
            this.$framework = app;
            return this;
        }
        throw new error_1.ServerlessError({
            message: 'Unsupported application framework',
            context: app,
        });
    }
    buildRequest() {
        /** Set a fake Socket since no connection is established */
        this.$request = new http_1.IncomingMessage({});
        this.$request.method = this.method;
        this.$request.headers = this.requestHeaders
            ? typeof this.requestHeaders['content-length'] === 'undefined'
                ? Object.assign(Object.assign({}, this.requestHeaders), { 'content-length': Buffer.byteLength(this.requestBody).toString() }) : this.requestHeaders
            : {};
        this.$request.url = this.url;
        this.$request.httpVersion = '1.1';
        this.$request.httpVersionMajor = 1;
        this.$request.httpVersionMinor = 1;
        this.$request.push(this.requestBody);
        this.$request.push(null);
        /** Mark the request as finished */
        this.$request.complete = true;
        return this;
    }
    buildResponse() {
        if (!this.$request) {
            throw new error_1.ServerlessError({
                message: 'Unable to build a response without a request instance',
                context: this,
            });
        }
        this.$response = new http_1.ServerResponse(this.$request);
        this.$response.useChunkedEncodingByDefault = false;
        this.$response.chunkedEncoding = false;
        this.$response.assignSocket(new stream_1.Writable({
            write: (chunk, encoding, cb) => {
                const data = Buffer.isBuffer(utilities_1.assertDefined(chunk))
                    ? chunk.toString('utf8')
                    : chunk;
                const done = typeof encoding === 'function' ? encoding : cb;
                if (this._wroteHeader) {
                    this.$body.push(Buffer.from(data));
                }
                else {
                    const index = data.indexOf(this._headerBreak);
                    if (index !== -1) {
                        const remainder = data.slice(index + this._headerBreak.length);
                        if (remainder) {
                            this.$body.push(Buffer.from(remainder));
                        }
                        this._wroteHeader = true;
                    }
                }
                if (typeof done === 'function') {
                    done(null);
                }
            },
            autoDestroy: true,
        }));
        return this;
    }
    execute() {
        if (!this.$framework) {
            throw new error_1.ServerlessError({
                message: `Cannot execute on request - response without a framework`,
                context: this,
            });
        }
        this.$framework(utilities_1.assertDefined(this.$request), utilities_1.assertDefined(this.$response));
        return new Promise((resolve, reject) => {
            const response = utilities_1.assertDefined(this.$response);
            response.once('finish', () => {
                /** Explicitly end the fake socket connection */
                response.socket.end();
                response.removeAllListeners();
                resolve({
                    body: Buffer.concat(this.$body),
                    statusCode: response.statusCode,
                    headers: this.sanitizeHeaders(response.getHeaders()),
                });
            });
            response.once('error', error => {
                reject(error);
            });
        });
    }
}
exports.ServerlessFactory = ServerlessFactory;
