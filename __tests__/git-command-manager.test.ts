import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { which } from '@actions/io';
import {
  GitCommandManager,
  IWorkingBaseAndType
} from '../src/git-command-manager';
import { WorkflowUtils } from '../src/workflow-utils';

const infoSpy: jest.SpyInstance<void, [message: string]> = jest.spyOn(
  core,
  'info'
);

const gitCommandManagerCreateFunctionMock = jest
  .fn()
  .mockImplementation(async (workingDirectory: string) => {
    const gitCommandManager: GitCommandManager = new GitCommandManager();
    await gitCommandManager.init(workingDirectory);
    return gitCommandManager;
  });
const initMock: jest.Mock<any, any, any> = jest.fn();
jest.mock('../src/git-command-manager', () => {
  return {
    ...jest.requireActual('../src/git-command-manager'),
    GitCommandManager: jest.fn().mockImplementation(() => {
      new WorkflowUtils();
      return {
        init: initMock
      };
    })
  };
});
const getErrorMessageMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation((error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  });
jest.mock('../src/workflow-utils', () => {
  return {
    WorkflowUtils: jest.fn().mockImplementation(() => {
      return {
        getErrorMessage: getErrorMessageMock
      };
    })
  };
});
jest.mock('@actions/io', () => {
  return {
    which: jest
      .fn()
      .mockImplementation(
        async (tool: string, check: boolean): Promise<string> => {
          if (tool === 'git' && check) {
            return new Promise(resolve => resolve('/usr/bin/git'));
          }
          return new Promise(reject => reject('Tool not found'));
        }
      )
  };
});

describe('Test git-command-manager.ts', (): void => {
  beforeEach((): void => {
    jest.resetModules();
  });

  describe('Test create function', (): void => {
    it('should create GitCommandManager instance', async (): Promise<void> => {
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      GitCommandManager.create = gitCommandManagerCreateFunctionMock;

      const gitCommandManager: GitCommandManager =
        await GitCommandManager.create(workingDirectory);

      expect(gitCommandManager).toBeDefined();
      expect(GitCommandManager).toHaveBeenCalledTimes(1);
      expect(initMock).toHaveBeenCalledTimes(1);
      expect(WorkflowUtils).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test init function', (): void => {
    let GitCommandManagerRealModule: typeof import('../src/git-command-manager');

    beforeAll((): void => {
      GitCommandManagerRealModule = jest.requireActual(
        '../src/git-command-manager'
      );
    });

    beforeEach((): void => {
      jest.resetModules();
    });

    it('should initialise GitCommandManager instance', async (): Promise<void> => {
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      expect(gitCommandManager).toBeDefined();
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(gitCommandManager.workingDirectory).toBe(workingDirectory);
      expect(gitCommandManager.gitPath).toBe('/usr/bin/git');
    });
  });

  describe('Test getRepoRemoteUrl function', (): void => {
    const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
    let GitCommandManagerRealModule: typeof import('../src/git-command-manager');

    beforeAll((): void => {
      GitCommandManagerRealModule = jest.requireActual(
        '../src/git-command-manager'
      );
    });

    beforeEach((): void => {
      jest.resetModules();
    });

    it('should return remote url', async (): Promise<void> => {
      const execMock: jest.SpyInstance = execSpy.mockImplementation(
        async (
          gitPath: string,
          args: string[],
          options: exec.ExecOptions
        ): Promise<number> => {
          if (
            args[0] === 'config' &&
            args[1] === '--get' &&
            args[2] === 'remote.origin.url' &&
            gitPath === '/usr/bin/git'
          ) {
            options.listeners?.stdout?.call(
              options.listeners.stdout,
              Buffer.from(
                'https://github.com/3dwardCh3nG/github-pull-request.git'
              )
            );
          }
          return new Promise(resolve => resolve(0));
        }
      );
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      const remoteUrl: string = await gitCommandManager.getRepoRemoteUrl();

      expect(remoteUrl).toBe('http://git.remote.url');
      expect(execMock).toHaveBeenCalledTimes(1);
      expect(execMock).toHaveBeenCalledWith(
        '/usr/bin/git',
        ['config', '--get', 'remote.origin.url'],
        expect.any(Object)
      );
    });
  });

  describe('Test getRemoteDetail function', (): void => {
    const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
    let GitCommandManagerRealModule: typeof import('../src/git-command-manager');

    beforeAll((): void => {
      GitCommandManagerRealModule = jest.requireActual(
        '../src/git-command-manager'
      );
    });

    beforeEach((): void => {
      jest.resetModules();
    });

    afterEach((): void => {
      delete process.env['GITHUB_SERVER_URL'];
    });

    it('should return remote detail', async (): Promise<void> => {
      const remoteUrl: string =
        'https://github.com/3dwardCh3nG/github-pull-request.git';
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      const remoteDetail: any =
        await gitCommandManager.getRemoteDetail(remoteUrl);

      expect(remoteDetail).toBeDefined();
      expect(remoteDetail.hostname).toBe('github.com');
      expect(remoteDetail.protocol).toBe('HTTPS');
      expect(remoteDetail.repository).toBe('3dwardCh3nG/github-pull-request');
    });

    it('should throw error when input non url as the github server url', async (): Promise<void> => {
      process.env['GITHUB_SERVER_URL'] = 'github.com';
      const remoteUrl: string =
        'https://github.com/3dwardCh3nG/github-pull-request.git';
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      expect(() => gitCommandManager.getRemoteDetail(remoteUrl)).toThrow(
        new Error('Not a valid GitHub Service URL')
      );
    });

    it('should throw error when remote url is not a valid github url', async (): Promise<void> => {
      const remoteUrl: string =
        'https://gitlab.com/3dwardCh3nG/github-pull-request.git';
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      expect(() => gitCommandManager.getRemoteDetail(remoteUrl)).toThrow(
        new Error(
          `The format of '${remoteUrl}' is not a valid GitHub repository URL`
        )
      );
    });
  });

  describe('Test getWorkingBaseAndType function', (): void => {
    const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
    let GitCommandManagerRealModule: typeof import('../src/git-command-manager');

    beforeAll((): void => {
      GitCommandManagerRealModule = jest.requireActual(
        '../src/git-command-manager'
      );
    });

    beforeEach((): void => {
      jest.resetModules();
    });

    it('should success and return working base and type when currently on a branch HEAD', async (): Promise<void> => {
      const execMock: jest.SpyInstance = execSpy.mockImplementation(
        async (
          gitPath: string,
          args: string[],
          options: exec.ExecOptions
        ): Promise<number> => {
          if (
            args[0] === 'symbolic-ref' &&
            args[1] === 'HEAD' &&
            args[2] === '--short' &&
            gitPath === '/usr/bin/git'
          ) {
            options.listeners?.stdout?.call(
              options.listeners.stdout,
              Buffer.from('this-is-the-develop-branch')
            );
          }
          return new Promise(resolve => resolve(0));
        }
      );
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      const workingBaseAndType: IWorkingBaseAndType =
        await gitCommandManager.getWorkingBaseAndType();

      expect(workingBaseAndType.workingBase).toBe('this-is-the-develop-branch');
      expect(workingBaseAndType.workingBaseType).toBe('branch');
      expect(execMock).toHaveBeenCalledTimes(1);
    });

    it('should success and return HEAD sha and type when currently on a commit as the detached HEAD', async (): Promise<void> => {
      const execMock: jest.SpyInstance = execSpy.mockImplementation(
        async (
          gitPath: string,
          args: string[],
          options: exec.ExecOptions
        ): Promise<number> => {
          if (
            args[0] === 'symbolic-ref' &&
            args[1] === 'HEAD' &&
            args[2] === '--short' &&
            gitPath === '/usr/bin/git'
          ) {
            options.listeners?.stdout?.call(
              options.listeners.stdout,
              Buffer.from('this-is-the-develop-branch')
            );
          }
          return new Promise(resolve => resolve(1));
        }
      );
      const workingDirectory: string = '/home/runner/work/_temp/_github_home';

      const gitCommandManager: GitCommandManager =
        await GitCommandManagerRealModule.GitCommandManager.create(
          workingDirectory
        );

      const workingBaseAndType: IWorkingBaseAndType =
        await gitCommandManager.getWorkingBaseAndType();

      expect(workingBaseAndType.workingBase).toBe('this-is-the-develop-branch');
      expect(workingBaseAndType.workingBaseType).toBe('branch');
      expect(execMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test function', (): void => {
    const execSpy: jest.SpyInstance = jest.spyOn(exec, 'exec');
    let GitCommandManagerRealModule: typeof import('../src/git-command-manager');

    beforeAll((): void => {
      GitCommandManagerRealModule = jest.requireActual(
        '../src/git-command-manager'
      );
    });

    beforeEach((): void => {
      jest.resetModules();
    });
  });
});
