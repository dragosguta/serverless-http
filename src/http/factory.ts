import url from 'url'
import Koa from 'koa'

import { Writable } from 'stream'

import {
  IncomingMessage,
  IncomingHttpHeaders,
  ServerResponse,
  OutgoingHttpHeaders,
} from 'http'

import { Socket } from 'net'

import { CloudFrontRequestEvent } from 'aws-lambda'
import { Application } from 'express'
import { assertDefined } from 'utilities'

import { ServerlessError } from '../util/error'
import { variations } from './set-cookie.json'

export interface ServerlessHeaders extends IncomingHttpHeaders {
  [header: string]: string | string[] | undefined
}

export class ServerlessFactory {
  private $framework:
    | ((request: IncomingMessage, response: ServerResponse) => void)
    | null = null
  private $request: IncomingMessage | null = null
  private $response: ServerResponse | null = null
  private $body: Buffer[] = []

  private _headerBreak = '\r\n\r\n'
  private _wroteHeader = false

  public readonly requestHeaders: ServerlessHeaders
  public readonly requestBody: Buffer
  public readonly method: string
  public readonly path: string
  public readonly ip: string
  public readonly url: string

  constructor(event: CloudFrontRequestEvent, opts?: { requestId: string }) {
    const {
      cf: { request, config },
    } = event.Records[0]

    this.requestHeaders = Object.keys(request.headers).reduce(
      (accum, header) => {
        const group = request.headers[header]
        accum[header.toLowerCase()] = group[group.length - 1].value
        return accum
      },
      {} as { [key: string]: string }
    )

    if (opts?.requestId) {
      this.requestHeaders[opts.requestId.toLowerCase()] = config.requestId
    }

    this.requestBody = Buffer.from(
      request.body?.data ?? '',
      request.body?.encoding === 'base64' ? 'base64' : 'utf8'
    )

    this.method = request.method
    this.path = request.uri
    this.ip = request.clientIp
    this.url = url.format({
      pathname: request.uri,
      search: request.querystring,
    })
  }

  /**
   * @todo fix type casting
   * @todo fix possibly empty string for header
   */
  private sanitizeHeaders(headers: OutgoingHttpHeaders) {
    return Object.keys(headers).reduce((accum, key) => {
      if (Array.isArray(headers[key])) {
        if (key.toLowerCase() === 'set-cookie') {
          (headers[key] as string[])?.forEach((cookie, index) => {
            accum[variations[index]] = cookie
          })
        } else {
          accum[key] = (headers[key] as string[])?.join(', ')
        }
      } else {
        accum[key] = headers[key]?.toString() ?? ''
      }
      return accum
    }, {} as ServerlessHeaders)
  }

  get request() {
    return this.$request
  }

  get response() {
    return this.$response
  }

  loadFramework(app: any) {
    /** Koa */
    if (typeof app.callback === 'function') {
      this.$framework = (app as Koa).callback()
      return this
    }

    /** ExpressJS */
    if (typeof app === 'function') {
      this.$framework = app as Application
      return this
    }

    throw new ServerlessError({
      message: 'Unsupported application framework',
      context: app,
    })
  }

  buildRequest() {
    /** Set a fake Socket since no connection is established */
    this.$request = new IncomingMessage({} as Socket)

    this.$request.method = this.method
    this.$request.headers = this.requestHeaders
      ? typeof this.requestHeaders['content-length'] === 'undefined'
        ? {
            ...this.requestHeaders,
            'content-length': Buffer.byteLength(this.requestBody).toString(),
          }
        : this.requestHeaders
      : {}

    this.$request.url = this.url
    this.$request.httpVersion = '1.1'
    this.$request.httpVersionMajor = 1
    this.$request.httpVersionMinor = 1

    this.$request.push(this.requestBody)
    this.$request.push(null)

    /** Mark the request as finished */
    this.$request.complete = true

    return this
  }

  buildResponse() {
    if (!this.$request) {
      throw new ServerlessError({
        message: 'Unable to build a response without a request instance',
        context: this,
      })
    }

    this.$response = new ServerResponse(this.$request)

    this.$response.useChunkedEncodingByDefault = false
    this.$response.chunkedEncoding = false

    this.$response.assignSocket(
      new Writable({
        write: (
          chunk: any,
          encoding: string,
          cb?: (error: Error | null | undefined) => void
        ) => {
          const data = Buffer.isBuffer(assertDefined(chunk))
            ? chunk.toString('utf8')
            : chunk

          const done = typeof encoding === 'function' ? encoding : cb

          if (this._wroteHeader) {
            this.$body.push(Buffer.from(data))
          } else {
            const index = data.indexOf(this._headerBreak)

            if (index !== -1) {
              const remainder = data.slice(index + this._headerBreak.length)

              if (remainder) {
                this.$body.push(Buffer.from(remainder))
              }

              this._wroteHeader = true
            }
          }

          if (typeof done === 'function') {
            done(null)
          }
        },
        autoDestroy: true,
      }) as Socket
    )

    return this
  }

  execute(): Promise<{
    headers: ServerlessHeaders
    body: Buffer | string
    statusCode: number
  }> {
    if (!this.$framework) {
      throw new ServerlessError({
        message: `Cannot execute on request - response without a framework`,
        context: this,
      })
    }

    this.$framework(assertDefined(this.$request), assertDefined(this.$response))

    return new Promise((resolve, reject) => {
      const response = assertDefined(this.$response)

      response.once('finish', () => {
        /** Explicitly end the fake socket connection */
        response.socket.end()
        response.removeAllListeners()

        resolve({
          body: Buffer.concat(this.$body),
          statusCode: response.statusCode,
          headers: this.sanitizeHeaders(response.getHeaders()),
        })
      })

      response.once('error', error => {
        reject(error)
      })
    })
  }
}
