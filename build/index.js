"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_1 = __importDefault(require("./http/serverless"));
var handler_1 = require("./http/handler");
Object.defineProperty(exports, "lambdaOriginRequest", { enumerable: true, get: function () { return handler_1.lambdaOriginRequest; } });
exports.default = serverless_1.default;
