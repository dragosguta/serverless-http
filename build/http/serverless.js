"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const factory_1 = require("./factory");
/**
 * Currently, only supports koa framework
 *
 * @param app - The node framework
 */
function serverless(app, handler) {
    return (event, _) => __awaiter(this, void 0, void 0, function* () {
        const factory = new factory_1.ServerlessFactory(event);
        const result = yield factory
            .loadFramework(app)
            .buildRequest()
            .buildResponse()
            .execute();
        return handler(result);
    });
}
exports.default = serverless;
