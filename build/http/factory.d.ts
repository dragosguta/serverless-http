/// <reference types="node" />
import { IncomingMessage, IncomingHttpHeaders, ServerResponse } from 'http';
import { CloudFrontRequestEvent } from 'aws-lambda';
export interface ServerlessHeaders extends IncomingHttpHeaders {
    [header: string]: string | string[] | undefined;
}
export declare class ServerlessFactory {
    private $framework;
    private $request;
    private $response;
    private $body;
    private _headerBreak;
    private _wroteHeader;
    readonly requestHeaders: ServerlessHeaders;
    readonly requestBody: Buffer;
    readonly method: string;
    readonly path: string;
    readonly ip: string;
    readonly url: string;
    constructor(event: CloudFrontRequestEvent, opts?: {
        requestId: string;
    });
    /**
     * @todo fix type casting
     * @todo fix possibly empty string for header
     */
    private sanitizeHeaders;
    get request(): IncomingMessage | null;
    get response(): ServerResponse | null;
    loadFramework(app: any): this;
    buildRequest(): this;
    buildResponse(): this;
    execute(): Promise<{
        headers: ServerlessHeaders;
        body: Buffer | string;
        statusCode: number;
    }>;
}
