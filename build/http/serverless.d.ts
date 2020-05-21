/// <reference types="koa-bodyparser" />
import Koa from 'koa';
import { Application } from 'express';
import { CloudFrontRequestEvent, Context } from 'aws-lambda';
import { HandlerResponse, HandlerRequest } from './handler';
/**
 * Currently, only supports koa framework
 *
 * @param app - The node framework
 */
export default function serverless(app: Application | Koa, handler: (response: HandlerRequest) => HandlerResponse): (event: CloudFrontRequestEvent, _?: Context | undefined) => Promise<HandlerResponse>;
