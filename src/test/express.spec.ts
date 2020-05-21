import express, { Application } from 'express'
import bodyParser from 'body-parser'
import zlib from 'zlib'

import { STATUS_CODES, IncomingHttpHeaders } from 'http'

import { CloudFrontRequestEvent } from 'aws-lambda'

import serverless from '../serverless'
import { lambdaOriginRequest } from '../handler'

import * as event from './cloudfront-request.json'

/** Helper function to execute flow */
const getOutput = async (app: Application, event: CloudFrontRequestEvent) => {
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

describe('Express CloudFront Integration', () => {
  let app: Application

  beforeEach(function () {
    app = express()
    app.use(bodyParser.json())
  })

  it('should set statusCode and default body', async () => {
    app.use('/some-path', function (_, res) {
      res.status(418).send(`I'm a teapot`)
    })

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toEqual(418)
    expect(response.statusDescription).toEqual(STATUS_CODES[response.status])
    expect(response.bodyEncoding).toBe('base64')
    expect(response._inflate().toString()).toEqual(`I'm a teapot`)
  })

  it('should receive query string and return object', async () => {
    app.use('/some-path', function (req, res) {
      res.status(200).send(req.query)
    })

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)
    expect(response._inflate().toString()).toEqual(
      `{"hello":"world","whats":"up"}`
    )
  })

  it('should set headers', async () => {
    app.use('/some-path', function (req, res) {
      res.set('x-test-header', 'foo')
      res.status(200).send()
    })

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.headers['x-test-header']).toBeDefined()
    expect(response.headers['x-test-header'].length).toBe(1)
    expect(response.headers['x-test-header'][0].key).toBe('x-test-header')
    expect(response.headers['x-test-header'][0].value).toBe('foo')
  })

  it('should get headers', async () => {
    let headers: IncomingHttpHeaders = {}
    app.use('/some-path', function (req, res) {
      headers = req.headers
      res.status(200).send()
    })

    await getOutput(app, event.get as CloudFrontRequestEvent)
    expect(headers['user-agent']).toEqual('Amazon CloudFront')
  })

  it('should handle post with request body', async () => {
    app.post('/another-one', function (req, res) {
      res.status(201).send(req.body.hello.world)
    })

    const response = await getOutput(app, event.post as CloudFrontRequestEvent)

    expect(response.status).toBe(201)
    expect(response._inflate().toString()).toEqual('this is a test')
  })

  it('should return 404s if no route matches', async () => {
    app.use('/some-other-path', function (_, res) {
      res.status(200).send()
    })

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(404)
    expect(response.statusDescription).toEqual(STATUS_CODES[response.status])
  })

  it('should handle compressed (base64 encoded) body', async () => {
    app.use('/some-path', function (_, res) {
      res.status(200).send('hello world 123')
    })

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(200)
    expect(response._inflate().toString()).toEqual('hello world 123')
  })

  it('should handle wildcard routing', async () => {
    app.use('*', function (_, res) {
      res.status(200).send('hello world!!')
    })

    const response = await getOutput(app, event.get as CloudFrontRequestEvent)

    expect(response.status).toBe(200)
    expect(response._inflate().toString()).toEqual('hello world!!')
  })
})
