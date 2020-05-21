export class ServerlessError<T> extends Error {
  public readonly message: string
  public readonly context: T | null

  constructor(opts: { message: string, context?: T }) {
    super(opts.message)

    this.message = opts.message
    this.context = opts.context ?? null
  }

  toString() {
    return this.message
  }

  toJSON() {
    return JSON.stringify({
      message: this.message,
      context: this.context,
    })
  }
}