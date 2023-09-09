import * as core from '@actions/core';
import * as io from '@actions/io';
import * as exec from '@actions/exec';
import { GitExecOutput } from './git-exec-output';
import { ErrorMessages, InfoMessages } from './message';
import path from 'path';
import { IWorkflowUtils, WorkflowUtils } from './workflow-utils';

const tagsRefSpec: string = '+refs/tags/*:refs/tags/*';

export interface IRemoteDetail {
  hostname: string;
  protocol: string;
  repository: string;
}

export interface IWorkingBaseAndType {
  workingBase: string;
  workingBaseType: 'commit' | 'branch';
}

export interface IGitCommandManager {
  getRepoRemoteUrl(): Promise<string>;

  getRemoteDetail(remoteUrl: string): IRemoteDetail;

  getWorkingBaseAndType(): Promise<IWorkingBaseAndType>;

  stashPush(options?: string[]): Promise<boolean>;

  stashPop(options?: string[]): Promise<void>;

  revParse(ref: string, options?: string[]): Promise<string>;

  checkout(ref: string, startPoint?: string): Promise<void>;

  fetch(remote: string, branch: string): Promise<boolean>;

  fetchRemote(
    refSpec: string[],
    remoteName?: string,
    options?: string[]
  ): Promise<void>;

  isAhead(branch1: string, branch2: string): Promise<boolean>;

  commitsAhead(branch1: string, branch2: string): Promise<number>;

  isEven(branch1: string, branch2: string): Promise<boolean>;

  pull(options?: string[]): Promise<void>;

  push(options?: string[]): Promise<void>;

  deleteBranch(branchName: string, options?: string[]): Promise<void>;

  status(options?: string[]): Promise<string>;

  hasDiff(options?: string[]): Promise<boolean>;

  config(
    configKey: string,
    configValue: string,
    globalConfig?: boolean,
    add?: boolean
  ): Promise<void>;

  configExists(configKey: string, globalConfig?: boolean): Promise<boolean>;

  unsetConfig(configKey: string, globalConfig?: boolean): Promise<boolean>;

  getGitDirectory(): Promise<string>;

  getWorkingDirectory(): string;

  setEnvironmentVariable(name: string, value: string): void;

  removeEnvironmentVariable(name: string): void;
}

export async function createGitCommandManager(
  workingDirectory: string
): Promise<IGitCommandManager> {
  return await GitCommandManager.create(workingDirectory);
}

export class GitCommandManager implements IGitCommandManager {
  private readonly workflowUtils: IWorkflowUtils;
  private gitPath = '';
  private workingDirectory = '';
  private gitEnv: { [p: string]: string } = {
    GIT_TERMINAL_PROMPT: '0', // Disable git prompt
    GCM_INTERACTIVE: 'Never' // Disable prompting for git credential manager
  };

  private constructor() {
    this.workflowUtils = new WorkflowUtils();
  }

  static async create(workingDirectory: string): Promise<GitCommandManager> {
    const gitCommandManager: GitCommandManager = new GitCommandManager();
    await gitCommandManager.init(workingDirectory);
    return gitCommandManager;
  }

  async getRepoRemoteUrl(): Promise<string> {
    const result: GitExecOutput = await this.execGit(
      ['config', '--get', 'remote.origin.url'],
      true,
      true
    );
    return result.getStdout().trim();
  }

  getRemoteDetail(remoteUrl: string): IRemoteDetail {
    const githubUrl: string =
      process.env['GITHUB_SERVER_URL'] || 'https://github.com';
    return this.githubHttpsUrlValidator(githubUrl, remoteUrl);
  }

  async getWorkingBaseAndType(): Promise<IWorkingBaseAndType> {
    const symbolicRefResult: GitExecOutput = await this.execGit(
      ['symbolic-ref', 'HEAD', '--short'],
      true
    );
    if (symbolicRefResult.exitCode === 0) {
      // ref
      return {
        workingBase: symbolicRefResult.getStdout(),
        workingBaseType: 'branch'
      } as IWorkingBaseAndType;
    } else {
      // detached HEAD
      const headSha: string = await this.revParse('HEAD');
      return {
        workingBase: headSha,
        workingBaseType: 'commit'
      } as IWorkingBaseAndType;
    }
  }

  async stashPush(options?: string[]): Promise<boolean> {
    const args: string[] = ['stash', 'push'];
    if (options) {
      args.push(...options);
    }
    const output: GitExecOutput = await this.execGit(args);
    return output.getStdout().trim() !== 'No local changes to save';
  }

  async stashPop(options?: string[]): Promise<void> {
    const args: string[] = ['stash', 'pop'];
    if (options) {
      args.push(...options);
    }
    await this.execGit(args);
  }

  async revParse(ref: string, options?: string[]): Promise<string> {
    const args: string[] = ['rev-parse'];
    if (options) {
      args.push(...options);
    }
    args.push(ref);
    const output: GitExecOutput = await this.execGit(args);
    return output.getStdout();
  }

  async checkout(ref: string, startPoint?: string): Promise<void> {
    const args: string[] = ['checkout', '--progress'];
    if (startPoint) {
      args.push('-B', ref, startPoint);
    } else {
      args.push(ref);
    }
    // https://github.com/git/git/commit/a047fafc7866cc4087201e284dc1f53e8f9a32d5
    args.push('--');
    await this.execGit(args);
  }

  async fetch(remote: string, branch: string): Promise<boolean> {
    try {
      await this.fetchRemote(
        [`${branch}:refs/remotes/${remote}/${branch}`],
        remote,
        ['--force']
      );
      return true;
    } catch {
      return false;
    }
  }

  async fetchRemote(
    refSpec: string[],
    remoteName?: string,
    options?: string[]
  ): Promise<void> {
    const args: string[] = ['-c', 'protocol.version=2', 'fetch'];
    if (!refSpec.some(x => x === tagsRefSpec)) {
      args.push('--no-tags');
    }

    args.push('--progress', '--no-recurse-submodules');
    if (
      this.workflowUtils.fileExistsSync(
        path.join(this.workingDirectory, '.git', 'shallow')
      )
    ) {
      args.push('--unshallow');
    }

    if (options) {
      args.push(...options);
    }

    if (remoteName) {
      args.push(remoteName);
    } else {
      args.push('origin');
    }
    for (const arg of refSpec) {
      args.push(arg);
    }

    await this.execGit(args);
  }

  async isAhead(branch1: string, branch2: string): Promise<boolean> {
    return (await this.commitsAhead(branch1, branch2)) > 0;
  }

  async commitsAhead(branch1: string, branch2: string): Promise<number> {
    const result: string = await this.revList(
      [`${branch1}...${branch2}`],
      ['--right-only', '--count']
    );
    return Number(result);
  }

  async isBehind(branch1: string, branch2: string): Promise<boolean> {
    return (await this.commitsBehind(branch1, branch2)) > 0;
  }

  async commitsBehind(branch1: string, branch2: string): Promise<number> {
    const result: string = await this.revList(
      [`${branch1}...${branch2}`],
      ['--left-only', '--count']
    );
    return Number(result);
  }

  async isEven(branch1: string, branch2: string): Promise<boolean> {
    return (
      !(await this.isAhead(branch1, branch2)) &&
      !(await this.isBehind(branch1, branch2))
    );
  }

  async pull(options?: string[]): Promise<void> {
    const args: string[] = ['pull'];
    if (options) {
      args.push(...options);
    }
    await this.execGit(args);
  }

  async push(options?: string[]): Promise<void> {
    const args: string[] = ['push'];
    if (options) {
      args.push(...options);
    }
    await this.execGit(args);
  }

  async deleteBranch(branchName: string, options?: string[]): Promise<void> {
    const args: string[] = ['branch', '--delete'];
    if (options) {
      args.push(...options);
    }
    args.push(branchName);
    await this.execGit(args);
  }

  async status(options?: string[]): Promise<string> {
    const args: string[] = ['status'];
    if (options) {
      args.push(...options);
    }
    const output: GitExecOutput = await this.execGit(args);
    return output.getStdout().trim();
  }

  async hasDiff(options?: string[]): Promise<boolean> {
    const args: string[] = ['diff', '--quiet'];
    if (options) {
      args.push(...options);
    }
    const output: GitExecOutput = await this.execGit(args, true);
    return output.exitCode === 1;
  }

  async config(
    configKey: string,
    configValue: string,
    globalConfig?: boolean,
    add?: boolean
  ): Promise<void> {
    const args: string[] = ['config', globalConfig ? '--global' : '--local'];
    if (add) {
      args.push('--add');
    }
    args.push(...[configKey, configValue]);
    await this.execGit(args);
  }

  async configExists(
    configKey: string,
    globalConfig?: boolean
  ): Promise<boolean> {
    const output: GitExecOutput = await this.execGit(
      [
        'config',
        globalConfig ? '--global' : '--local',
        '--name-only',
        '--get-regexp',
        configKey
      ],
      true
    );
    return output.exitCode === 0;
  }

  async unsetConfig(
    configKey: string,
    globalConfig?: boolean
  ): Promise<boolean> {
    const output: GitExecOutput = await this.execGit(
      [
        'config',
        globalConfig ? '--global' : '--local',
        '--unset-all',
        configKey
      ],
      true
    );
    return output.exitCode === 0;
  }

  async getGitDirectory(): Promise<string> {
    return this.revParse('--git-dir');
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  private async revList(
    commitExpression: string[],
    options?: string[]
  ): Promise<string> {
    const args: string[] = ['rev-list'];
    if (options) {
      args.push(...options);
    }
    args.push(...commitExpression);
    const output: GitExecOutput = await this.execGit(args);
    return output.getStdout().trim();
  }

  private async init(workingDirectory: string): Promise<void> {
    core.info(InfoMessages.INITIALISING_GIT_COMMAND_MANAGER);
    this.workingDirectory = workingDirectory;
    this.gitPath = await io.which('git', true);
  }

  private async execGit(
    args: string[],
    ignoreReturnCode = false,
    silent = false
  ): Promise<GitExecOutput> {
    const output: GitExecOutput = new GitExecOutput();

    const env: { [p: string]: string } = this.getEnvs();

    const execOptions: exec.ExecOptions = {
      cwd: this.workingDirectory,
      env,
      ignoreReturnCode,
      silent,
      listeners: {
        stdout: (data: Buffer) => {
          output.addStdoutLine(data.toString());
        },
        stderr: (data: Buffer) => {
          output.addStderrLine(data.toString());
        },
        debug: (data: string) => {
          output.addDebugLine(data);
        }
      }
    };

    const exitCode: number = await exec.exec(this.gitPath, args, execOptions);
    output.exitCode = exitCode;

    return output;
  }

  private getEnvs(): { [key: string]: string } {
    const env: { [key: string]: string } = {};
    for (const key of Object.keys(process.env)) {
      env[key] = process.env[key] || '';
    }
    for (const key of Object.keys(this.gitEnv)) {
      env[key] = this.gitEnv[key];
    }
    return env;
  }

  private urlMatcher(url: string): RegExpMatchArray {
    const pattern: string = '/^https?:\\/\\/(.+)$/i';
    const matches: RegExpMatchArray | null = url.match(pattern);
    if (!matches) {
      throw new Error(ErrorMessages.URL_MATCHER_FAILED);
    }
    return matches;
  }

  private githubHttpsUrlPattern(host: string): RegExp {
    return new RegExp(`^https?://.*@?${host}/(.+/.+?)(\\.git)?$`, 'i');
  }

  private githubHttpsUrlMatcher(
    host: string,
    url: string
  ): RegExpMatchArray | null {
    const ghHttpsUrlPattern: RegExp = this.githubHttpsUrlPattern(host);
    return url.match(ghHttpsUrlPattern);
  }

  private githubHttpsUrlValidator(
    githubUrl: string,
    remoteUrl: string
  ): IRemoteDetail {
    const githubUrlMatchArray: RegExpMatchArray = this.urlMatcher(githubUrl);
    const host: string = githubUrlMatchArray[1];
    const githubHttpsMatchArray: RegExpMatchArray | null =
      this.githubHttpsUrlMatcher(host, remoteUrl);
    if (githubHttpsMatchArray) {
      return {
        hostname: host,
        protocol: 'HTTPS',
        repository: githubHttpsMatchArray[1]
      };
    }
    throw new Error(
      `The format of '${githubUrl}' is not a valid GitHub repository URL`
    );
  }

  setEnvironmentVariable(name: string, value: string): void {
    this.gitEnv[name] = value;
  }

  removeEnvironmentVariable(name: string): void {
    delete this.gitEnv[name];
  }
}
