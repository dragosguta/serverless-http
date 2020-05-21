import Koa from 'koa'
import { Application } from 'express'

import { CloudFrontRequestEvent, Context } from 'aws-lambda'

import { HandlerResponse, HandlerRequest } from './handler'
import { ServerlessFactory } from './factory'

/**
 * Currently, only supports koa framework
 *
 * @param app - The node framework
 */
export default function serverless(app: Application | Koa, handler: (response: HandlerRequest) => HandlerResponse) {
  return async (event: CloudFrontRequestEvent, _?: Context) => {
    const factory = new ServerlessFactory(event)

    const result = await factory
      .loadFramework(app)
      .buildRequest()
      .buildResponse()
      .execute()

    return handler(result)
  }
}
