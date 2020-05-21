/// <reference types="node" />
import { OutgoingHttpHeaders } from 'http';
import { ServerlessHeaders } from './factory';
export declare function isBinaryEncoded(headers: OutgoingHttpHeaders, supportedEncodings?: string[]): boolean;
export declare const readOnlyHeaders: string[];
export interface HandlerResponse {
    status: number;
    statusDescription: string;
    headers: {
        [key: string]: {
            key: string;
            value: string;
        }[];
    };
    bodyEncoding: string;
    body: string;
}
export interface HandlerRequest {
    headers: ServerlessHeaders;
    statusCode: number;
    body: Buffer | string;
}
export declare function lambdaOriginRequest(opts: HandlerRequest): HandlerResponse;
