"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaOriginRequest = exports.readOnlyHeaders = exports.isBinaryEncoded = void 0;
const zlib_1 = __importDefault(require("zlib"));
const http_1 = require("http");
function isBinaryEncoded(headers, supportedEncodings = ['gzip']) {
    return typeof headers['content-encoding'] === 'string'
        ? headers['content-encoding']
            .split(',')
            .some((value) => supportedEncodings.includes(value))
        : false;
}
exports.isBinaryEncoded = isBinaryEncoded;
exports.readOnlyHeaders = [
    'accept-encoding',
    'content-length',
    'if-modified-since',
    'if-none-Match',
    'if-range',
    'if-unmodified-since',
    'range',
    'transfer-encoding',
    'via',
];
function lambdaOriginRequest(opts) {
    var _a;
    const lambdaHeaders = Object.keys(opts.headers).reduce((accum, key) => {
        var _a, _b, _c, _d;
        const normalizedKey = key.toLowerCase();
        if (!exports.readOnlyHeaders.includes(normalizedKey)) {
            if (accum[normalizedKey]) {
                accum[normalizedKey].push({
                    key,
                    value: (_b = (_a = opts.headers[key]) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '',
                });
            }
            else {
                accum[normalizedKey] = [
                    {
                        key,
                        value: (_d = (_c = opts.headers[key]) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : '',
                    },
                ];
            }
        }
        return accum;
    }, {
        'content-encoding': [
            {
                key: 'content-encoding',
                value: 'gzip',
            },
        ],
    });
    return {
        status: opts.statusCode,
        statusDescription: (_a = http_1.STATUS_CODES[opts.statusCode]) !== null && _a !== void 0 ? _a : '',
        headers: lambdaHeaders,
        bodyEncoding: 'base64',
        body: !isBinaryEncoded(opts.headers)
            ? zlib_1.default.gzipSync(opts.body).toString('base64')
            : opts.body.toString('base64'),
    };
}
exports.lambdaOriginRequest = lambdaOriginRequest;
