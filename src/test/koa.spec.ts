import koa from 'koa'
import http from 'koa-route'
import zlib from 'zlib'
import bodyparser from 'koa-bodyparser'
import compress from 'koa-compress'

import { STATUS_CODES } from 'http'

import { CloudFrontRequestEvent } from 'aws-lambda'

import serverless from '../http/serverless'
import { lambdaOriginRequest } from '../http/handler'

import * as event from './cloudfront-request.json'

/** Helper function to get response */
const getOutput = async (app: koa, event: CloudFrontRequestEvent) => {
  const wrapped = serverless(app, lambdaOriginRequest)
  const output = await wrapped(event as CloudFrontRequestEvent)
  return {
    ...output,
    _inflate: () => {
      const decoded = Buffer.from(output.body, 'base64')
      return zlib.unzipSync(decoded)
    },
  }
}

describe('Koa CloudFront Integration', () => {
  let app: koa

  beforeEach(function () {
    app = new koa()
    app.use(bodyparser())
    app.use(compress())
  })

  it('should set statusCode and default body', async () => {
    app.use(
      http.get('/some-path', async (ctx) => {
        ctx.status = 200
      })
    )

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toEqual(200)
    expect(response.statusDescription).toEqual(STATUS_CODES[response.status])
    expect(response.bodyEncoding).toBe('base64')
    expect(response._inflate().toString()).toEqual('OK')
  })

  it('should receive query string and return object', async () => {
    app.use(
      http.get('/some-path', async (ctx) => {
        ctx.status = 200
        ctx.body = ctx.query
      })
    )

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)
    expect(response._inflate().toString()).toEqual(
      `{"hello":"world","whats":"up"}`
    )
  })

  it('should set headers', async () => {
    app.use(
      http.get('/some-path', async (ctx) => {
        ctx.status = 200
        ctx.set('x-test-header', 'foo')
      })
    )

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.headers['x-test-header']).toBeDefined()
    expect(response.headers['x-test-header'].length).toBe(1)
    expect(response.headers['x-test-header'][0].key).toBe('x-test-header')
    expect(response.headers['x-test-header'][0].value).toBe('foo')
  })

  it('should get headers', async () => {
    let headers: { [key: string]: string } = {}
    app.use(
      http.get('/some-path', async (ctx) => {
        ctx.status = 200
        headers = ctx.request.headers
      })
    )

    await getOutput(app, event.get as CloudFrontRequestEvent)
    expect(headers['user-agent']).toEqual('Amazon CloudFront')
  })

  it('should allow context to throw', async () => {
    app.use(
      http.get('/some-path', async (ctx) => {
        ctx.throw(401, `Unauthorized: ${ctx.request.method} ${ctx.request.url}`)
      })
    )

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(401)
    expect(response._inflate().toString()).toEqual(
      'Unauthorized: GET /some-path?hello=world&whats=up'
    )
  })

  it('should handle post with request body', async () => {
    app.use(
      http.post('/another-one', async (ctx) => {
        ctx.status = 201
        ctx.body = ctx.request.body.hello.world
      })
    )

    const response = await getOutput(app, event.post as CloudFrontRequestEvent)

    expect(response.status).toBe(201)
    expect(response._inflate().toString()).toEqual('this is a test')
  })

  it('should return 404s if no route matches', async () => {
    app.use(
      http.get('/some-other-path', async (ctx) => {
        ctx.status = 200
      })
    )

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(404)
    expect(response.statusDescription).toEqual(STATUS_CODES[response.status])
  })

  it('should handle compressed (base64 encoded) body', async () => {
    app.use(
      http.get('/some-path', async (ctx) => {
        ctx.status = 200
        ctx.body = 'hello world 123'
      })
    )

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(200)
    expect(response._inflate().toString()).toEqual('hello world 123')
  })

  it('should handle wildcard routing', async () => {
    app.use(
      http.get('*', async (ctx) => {
        ctx.status = 200
        ctx.body = 'hello world!!'
      })
    )


    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(200)
    expect(response._inflate().toString()).toEqual('hello world!!')
  })
})