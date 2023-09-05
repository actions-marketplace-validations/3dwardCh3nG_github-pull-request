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

  setExitCode(exitCode: number): void {
    this.exitCode = exitCode;
  }

  getExitCode(): number {
    return this.exitCode;
  }

  addStdoutLine(line: string): void {
    this.stdout.push(line);
  }

  getStdout(): string {
    return this.stdout.join('\n');
  }

  addStderrLine(line: string): void {
    this.stderr.push(line);
  }

  getStderr(): string {
    return this.stderr.join('\n');
  }

  addDebugLine(line: string): void {
    this.debug.push(line);
  }

  getDebug(): string {
    return this.debug.join('\n');
  }
}
