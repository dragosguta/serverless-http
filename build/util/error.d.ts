export declare class ServerlessError<T> extends Error {
    readonly message: string;
    readonly context: T | null;
    constructor(opts: {
        message: string;
        context?: T;
    });
    toString(): string;
    toJSON(): string;
}
