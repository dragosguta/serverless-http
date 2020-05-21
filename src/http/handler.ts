import zlib from 'zlib'

import { STATUS_CODES, OutgoingHttpHeaders } from 'http'

import { ServerlessHeaders } from './factory'

export function isBinaryEncoded(
  headers: OutgoingHttpHeaders,
  supportedEncodings = ['gzip']
) {
  return typeof headers['content-encoding'] === 'string'
    ? headers['content-encoding']
        .split(',')
        .some((value) => supportedEncodings.includes(value))
    : false
}

export const readOnlyHeaders = [
  'accept-encoding',
  'content-length',
  'if-modified-since',
  'if-none-Match',
  'if-range',
  'if-unmodified-since',
  'range',
  'transfer-encoding',
  'via',
]

export interface HandlerResponse {
  status: number
  statusDescription: string
  headers: { [key: string]: { key: string; value: string }[] }
  bodyEncoding: string
  body: string
}

export interface HandlerRequest {
  headers: ServerlessHeaders
  statusCode: number
  body: Buffer | string
}

export function lambdaOriginRequest(opts: HandlerRequest): HandlerResponse {
  const lambdaHeaders = Object.keys(opts.headers).reduce(
    (accum, key) => {
      const normalizedKey = key.toLowerCase()
      if (!readOnlyHeaders.includes(normalizedKey)) {
        if (accum[normalizedKey]) {
          accum[normalizedKey].push({
            key,
            value: opts.headers[key]?.toString() ?? '',
          })
        } else {
          accum[normalizedKey] = [
            {
              key,
              value: opts.headers[key]?.toString() ?? '',
            },
          ]
        }
      }
      return accum
    },
    {
      'content-encoding': [
        {
          key: 'content-encoding',
          value: 'gzip',
        },
      ],
    } as {
      [key: string]: { key: string; value: string }[]
    }
  )

  return {
    status: opts.statusCode,
    statusDescription: STATUS_CODES[opts.statusCode] ?? '',
    headers: lambdaHeaders,
    bodyEncoding: 'base64',
    body: !isBinaryEncoded(opts.headers)
      ? zlib.gzipSync(opts.body).toString('base64')
      : opts.body.toString('base64'),
  }
}
