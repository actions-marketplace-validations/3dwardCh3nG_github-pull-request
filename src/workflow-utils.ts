import * as core from '@actions/core';
import * as path from 'path';
import { ErrorMessages } from './message';
import fs from 'fs';

export interface IWorkflowUtils {
  getRepoPath(relativePath?: string): string;

  fileExistsSync(path: string): boolean;

  getErrorMessage(error: unknown): string;
}

export function createWorkflowUtils(): IWorkflowUtils {
  return new WorkflowUtils();
}

class WorkflowUtils implements IWorkflowUtils {
  getRepoPath(relativePath?: string): string {
    let ghWorkspacePath = process.env['GITHUB_WORKSPACE'];
    if (!ghWorkspacePath) {
      throw new Error(ErrorMessages.GITHUB_WORKSPACE_NOT_DEFINED);
    }
    ghWorkspacePath = path.resolve(ghWorkspacePath);
    core.debug(`githubWorkspacePath: ${ghWorkspacePath}`);

    let repoPath = ghWorkspacePath;
    if (relativePath) repoPath = path.resolve(ghWorkspacePath, relativePath);

    core.debug(`repoPath: ${repoPath}`);
    return repoPath;
  }

  fileExistsSync(path: string): boolean {
    if (!path) {
      throw new Error("Arg 'path' must not be empty");
    }

    let stats: fs.Stats;
    try {
      stats = fs.statSync(path);
    } catch (error) {
      if (this.hasErrorCode(error) && error.code === 'ENOENT') {
        return false;
      }

      throw new Error(
        `Encountered an error when checking whether path '${path}' exists: ${this.getErrorMessage(
          error,
        )}`,
      );
    }

    return !stats.isDirectory();
  }

  getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private hasErrorCode(error: any): error is { code: string } {
    return typeof (error && error.code) === 'string';
  }
}
