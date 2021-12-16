export class ScriptError extends Error {
  public script: string;
  public readonly line: number;

  constructor(
    message: string,
    line?: number,
    script?: string,
  ) {
    super(message);
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.line = line ?? 0;
    this.script = script ?? '';
  }
}
