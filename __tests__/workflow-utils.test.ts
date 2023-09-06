import * as core from '@actions/core';
import { WorkflowUtils } from '../src/workflow-utils';
import { ErrorMessages } from '../src/message';
import path from 'path';

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('path', () => {
  return {
    resolve: jest.fn().mockImplementation((...paths: string[]): string => {
      return paths.join('/');
    })
  };
});
const debugMock: jest.SpyInstance<void, [message: string]> = jest.spyOn(
  core,
  'debug'
);
describe('Test workflow-utils.ts', (): void => {
  let resolveSpy: jest.SpyInstance<string, string[]>;

  beforeAll((): void => {
    resolveSpy = jest.spyOn(path, 'resolve');
  });

  describe('Test getRepoPath function', (): void => {
    it('will return repoPath with relativePath', (): void => {
      const workspacePath: string = 'workspacePath';
      process.env['GITHUB_WORKSPACE'] = workspacePath;
      const relativePath: string = 'relativePath';

      const workflowUtils: WorkflowUtils = new WorkflowUtils();
      const repoPath: string = workflowUtils.getRepoPath(relativePath);

      expect(workflowUtils).toBeDefined();
      expect(resolveSpy).toHaveBeenCalledTimes(2);
      expect(repoPath).toEqual('workspacePath/relativePath');
      expect(debugMock).toHaveBeenCalledTimes(2);
    });

    it('will return repoPath without relativePath', (): void => {
      const workspacePath: string = 'workspacePath';
      process.env['GITHUB_WORKSPACE'] = workspacePath;

      const workflowUtils: WorkflowUtils = new WorkflowUtils();
      const repoPath: string = workflowUtils.getRepoPath();

      expect(workflowUtils).toBeDefined();
      expect(resolveSpy).toHaveBeenCalledTimes(1);
      expect(repoPath).toEqual('workspacePath');
      expect(debugMock).toHaveBeenCalledTimes(2);
    });

    it('will throw error when GITHUB_WORKSPACE is not defined', (): void => {
      const workflowUtils: WorkflowUtils = new WorkflowUtils();
      expect(() => workflowUtils.getRepoPath()).toThrow(
        new Error(ErrorMessages.GITHUB_WORKSPACE_NOT_DEFINED)
      );
    });
  });
});
/* eslint-enable */
