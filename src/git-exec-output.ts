export class GitExecOutput {
  private exitCode: number;
  private stdout: string[];
  private stderr: string[];
  private debug: string[];

  constructor() {
    this.exitCode = 0;
    this.stdout = [];
    this.stderr = [];
    this.debug = [];
  }

  public setExitCode(exitCode: number): void {
    this.exitCode = exitCode;
  }

  public getExitCode(): number {
    return this.exitCode;
  }

  public addStdoutLine(line: string): void {
    this.stdout.push(line);
  }

  public getStdout(): string {
    return this.stdout.join('\n');
  }

  public addStderrLine(line: string): void {
    this.stderr.push(line);
  }

  public getStderr(): string {
    return this.stderr.join('\n');
  }

  public addDebugLine(line: string): void {
    this.debug.push(line);
  }

  public getDebug(): string {
    return this.debug.join('\n');
  }
}
