export class RestError extends Error {
  readonly #status: number;

  constructor(status: number, msg?: string, opts?: ErrorOptions) {
    super(msg, opts);
    this.#status = status;
  }

  get status() {
    return this.#status;
  }
}

export const SUCCESS = "SUCCESS" as const;
export const ERROR = "ERROR" as const;

export const Ok = <R>(value: R) => ({ result: SUCCESS, value });
export const Err = <E extends Error = Error>(error: E) => ({
  result: ERROR,
  error,
});

export type Result<R = null, E extends Error = Error> =
  | ReturnType<typeof Ok<R>>
  | ReturnType<typeof Err<E>>;
