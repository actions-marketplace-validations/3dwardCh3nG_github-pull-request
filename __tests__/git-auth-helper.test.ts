import * as core from '@actions/core';
import * as io from '@actions/io';
import {
  createGitCommandManager,
  GitCommandManager,
  IGitCommandManager
} from '../src/git-command-manager';
import {
  GitSourceSettings,
  IGitSourceSettings
} from '../src/git-source-settings';
import { GitAuthHelper, IGitAuthHelper } from '../src/git-auth-helper';
import { v4 as uuidv4, V4Options } from 'uuid';
import * as NodePromisesModule from 'node:fs/promises';
import * as assert from 'assert';
import * as os from 'os';
import * as process from 'node:process';
import path from 'path';
import { PathLike } from 'fs';
import { FileHandle } from 'fs/promises';

/* eslint-disable @typescript-eslint/no-explicit-any */
const repositoryPath: string = 'repositoryPath';
const repositoryOwner: string = 'repositoryOwner';
const repositoryName: string = 'repositoryName';
const authToken: string = 'authToken';
const gitSourceSettings: IGitSourceSettings = new GitSourceSettings(
  repositoryPath,
  repositoryOwner,
  repositoryName,
  authToken,
  undefined,
  '1234567890',
  undefined,
  undefined,
  false,
  false
);

const infoMock: jest.SpyInstance<void, [message: string]> = jest.spyOn(
  core,
  'info'
);
const setSecretSpy: jest.SpyInstance<any, any> = jest.spyOn(core, 'setSecret');
const saveStateSpy: jest.SpyInstance<any, any> = jest.spyOn(core, 'saveState');
const configExistsMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation(async (): Promise<boolean> => {
    return Promise.resolve(true);
  });
const unsetConfigMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation(async (): Promise<boolean> => {
    return Promise.resolve(true);
  });
const configMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation(async (): Promise<void> => {
    return Promise.resolve();
  });
const getWorkingDirectoryMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation((): string => {
    return '~';
  });
const setEnvironmentVariableMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation((): void => {});
const gitCommandManagerMock: GitCommandManager = {
  ...jest.requireActual('../src/git-command-manager').GitCommandManager,
  config: configMock,
  configExists: configExistsMock,
  unsetConfig: unsetConfigMock,
  getGitDirectory: jest.fn(),
  getWorkingDirectory: getWorkingDirectoryMock,
  setEnvironmentVariable: setEnvironmentVariableMock
} as GitCommandManager;
jest.mock('../src/git-command-manager', () => {
  return {
    GitCommandManager: jest.fn().mockImplementation(() => {
      return gitCommandManagerMock;
    }),
    createGitCommandManager: jest.fn().mockImplementation(async () => {
      return Promise.resolve(gitCommandManagerMock);
    })
  };
});
const gitConfigContent: string = `[core]
  \trepositoryformatversion = 0
  \tfilemode = true
  \tbare = false
  \tlogallrefupdates = true
  \tignorecase = true
  \tprecomposeunicode = true
  \thttp.https://github.com/.extraheader = AUTHORIZATION: basic ***
  [remote "origin"]
  \turl = https://github.com/3dwardCh3nG/github-pull-request.git
  \tfetch = +refs/heads/*:refs/remotes/origin/*
  [branch "main"]
  \tremote = origin
  \tmerge = refs/heads/main`;
const buffer: Buffer = Buffer.from(gitConfigContent);
jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    promises: {
      ...jest.requireActual('fs/promises'),
      readFile: jest
        .fn()
        .mockImplementation(
          async (path: PathLike | FileHandle): Promise<Buffer | string> => {
            if (path === '~/.git/config') {
              return Promise.resolve(buffer);
            } else if (path === '/home/runner/.ssh/known_hosts') {
              return Promise.resolve('127.0.0.1');
            }
            return Promise.resolve('');
          }
        ),
      writeFile: jest.fn(),
      mkdir: jest.fn()
    }
  } as typeof NodePromisesModule;
});
jest.mock('assert', () => {
  return {
    ...jest.requireActual('assert'),
    ok: jest.fn().mockImplementation((): any => {})
  };
});
jest.mock('@actions/io', () => {
  return {
    ...jest.requireActual('@actions/io'),
    rmRF: jest.fn(),
    which: jest.fn()
  };
});
jest.mock('os');
jest.mock('node:process', () => {
  return {
    ...jest.requireActual('node:process'),
    platform: jest.fn().mockImplementation((): string => {
      return 'linux';
    })
  };
});
jest.mock('path', () => {
  return {
    ...jest.requireActual('path'),
    join: jest.fn()
  };
});

describe('Test git-auth-helper.ts', (): void => {
  let gitCommanderManager: IGitCommandManager;

  beforeAll(async (): Promise<void> => {
    gitCommanderManager = await createGitCommandManager(repositoryPath);
  });

  describe('Test constructor', (): void => {
    it('should create an instance with initialised values', (): void => {
      const basicCredential: string = Buffer.from(
        `x-access-token:${authToken}`,
        'utf8'
      ).toString('base64');

      const gitAuthHelper: IGitAuthHelper = new GitAuthHelper(
        gitCommanderManager,
        gitSourceSettings
      );
      expect(gitAuthHelper).toBeDefined();
      expect(gitAuthHelper.tokenConfigKey).toEqual(
        'http.https://github.com/.extraheader'
      );
      expect(setSecretSpy).toHaveBeenCalledTimes(1);
      expect(setSecretSpy).toHaveBeenCalledWith(basicCredential);
      expect(gitAuthHelper.tokenConfigValue).toEqual(
        `AUTHORIZATION: basic ${basicCredential}`
      );
      expect(gitAuthHelper.insteadOfKey).toEqual(
        `url.https://github.com/.insteadOf`
      );
      expect(gitAuthHelper.insteadOfValues).toEqual([
        'git@github.com:',
        'org-1234567890@github.com:'
      ]);
    });
  });

  describe('Test configureAuth function', (): void => {
    const pathJoinFuncMock = function (...paths: string[]): string {
      return paths.join('/');
    };
    const pathJoinMock = jest
      .spyOn(path, 'join')
      .mockImplementation(pathJoinFuncMock);
    let assertOkSpy: jest.SpyInstance<any, any> = jest.spyOn(assert, 'ok');

    beforeAll((): void => {
      jest.spyOn(io, 'rmRF').mockImplementation(async (): Promise<void> => {});
      jest
        .spyOn(io, 'which')
        .mockImplementation(
          async (tool: string, check?: boolean): Promise<string> => {
            if (tool === 'ssh' && check) {
              return Promise.resolve('/usr/bin/ssh');
            } else if (tool === 'git' && check) {
              return Promise.resolve('/usr/bin/git');
            }
            return Promise.resolve('');
          }
        );
      jest.spyOn(os, 'homedir').mockReturnValue('/home/runner');
    });

    it('should call removeToken and configureToken and success', async (): Promise<void> => {
      const gitAuthHelper: IGitAuthHelper = new GitAuthHelper(
        gitCommanderManager,
        gitSourceSettings
      );

      await gitAuthHelper.configureAuth();

      expect(configExistsMock).toHaveBeenCalledTimes(2);
      expect(configExistsMock).toHaveBeenCalledWith('core.sshCommand');
      expect(configExistsMock).toHaveBeenCalledWith(
        'http.https://github.com/.extraheader'
      );
      expect(unsetConfigMock).toHaveBeenCalledTimes(2);
      expect(unsetConfigMock).toHaveBeenCalledWith('core.sshCommand');
      expect(unsetConfigMock).toHaveBeenCalledWith(
        'http.https://github.com/.extraheader'
      );
      expect(getWorkingDirectoryMock).toHaveBeenCalledTimes(1);
      expect(configMock).toHaveBeenCalledTimes(1);
      expect(configMock).toHaveBeenCalledWith(
        'http.https://github.com/.extraheader',
        `AUTHORIZATION: basic ***`,
        undefined
      );
      expect(assertOkSpy).toHaveBeenCalledTimes(3);
    });

    it('should call additional removeSsh and configureSsh and success', async (): Promise<void> => {
      const basicCredential: string = Buffer.from(
        `x-access-token:${authToken}`,
        'utf8'
      ).toString('base64');

      const runnerTemp: string = '/tmp';
      process.env['RUNNER_TEMP'] = runnerTemp;

      const githubServerUrl: string = 'https://www.github.com.au';
      const sshKey: string = 'sshKey';
      const sshKnownHosts: string = 'sshKnownHosts';
      const sshStrict: boolean = true;
      const persistCredentials: boolean = true;
      const gitSourceSettings: IGitSourceSettings = new GitSourceSettings(
        repositoryPath,
        repositoryOwner,
        repositoryName,
        authToken,
        githubServerUrl,
        '1234567890',
        sshKey,
        sshKnownHosts,
        sshStrict,
        persistCredentials
      );

      const gitAuthHelper: IGitAuthHelper = new GitAuthHelper(
        gitCommanderManager,
        gitSourceSettings
      );

      await gitAuthHelper.configureAuth();

      const sshKeyPath: string = gitAuthHelper.sshKeyPath;
      const slashIndex: number = sshKeyPath.lastIndexOf('/');
      const uuid4: string = sshKeyPath.substring(slashIndex + 1);
      const sshKnownHostsPath: string = `/tmp/${uuid4}_known_hosts`;
      const sshKeyPathBaseName: string = path.basename(
        gitAuthHelper.sshKeyPath
      );
      const sshKnownHostsPathBaseName: string = path.basename(
        gitAuthHelper.sshKnownHostsPath
      );
      let sshCommand: string = `"/usr/bin/ssh" -i "$RUNNER_TEMP/${sshKeyPathBaseName}"`;
      sshCommand += ' -o StrictHostKeyChecking=yes -o CheckHostIP=no';
      sshCommand += ` -o "UserKnownHostsFile=$RUNNER_TEMP/${sshKnownHostsPathBaseName}"`;

      // removeAuth()
      // expect(rmRFFuncMock).toHaveBeenCalledTimes(2);
      expect(configExistsMock).toHaveBeenCalledTimes(2);
      expect(configExistsMock).toHaveBeenCalledWith('core.sshCommand');
      expect(configExistsMock).toHaveBeenCalledWith(
        'http.https://www.github.com.au/.extraheader'
      );
      expect(unsetConfigMock).toHaveBeenCalledTimes(2);
      expect(unsetConfigMock).toHaveBeenCalledWith('core.sshCommand');
      expect(unsetConfigMock).toHaveBeenCalledWith(
        'http.https://www.github.com.au/.extraheader'
      );
      // configureSsh()
      expect(assertOkSpy).toHaveBeenCalledTimes(4);
      expect(assertOkSpy).toHaveBeenCalledWith(
        runnerTemp,
        'RUNNER_TEMP is not defined'
      );
      expect(assertOkSpy).toHaveBeenCalledWith(
        true,
        'Unexpected configureToken parameter combinations'
      );
      expect(assertOkSpy).toHaveBeenCalledWith(
        '~/.git/config',
        'configPath is not defined'
      );
      expect(assertOkSpy).toHaveBeenCalledWith(
        `AUTHORIZATION: basic ${basicCredential}`,
        'tokenConfigValue is not defined'
      );
      expect(pathJoinMock).toHaveBeenCalledTimes(4);
      expect(pathJoinMock).toHaveBeenCalledWith(runnerTemp, uuid4);
      expect(pathJoinMock).toHaveBeenCalledWith(
        '/home/runner',
        '.ssh',
        'known_hosts'
      );
      expect(pathJoinMock).toHaveBeenCalledWith(
        runnerTemp,
        `${uuid4}_known_hosts`
      );
      expect(pathJoinMock).toHaveBeenCalledWith('~', '.git', 'config');
      expect(saveStateSpy).toHaveBeenCalledTimes(2);
      expect(saveStateSpy).toHaveBeenCalledWith('sshKeyPath', sshKeyPath);
      expect(saveStateSpy).toHaveBeenCalledWith(
        'sshKnownHostsPath',
        sshKnownHostsPath
      );
      expect(gitAuthHelper.sshKnownHostsPath).toEqual(sshKnownHostsPath);
      expect(infoMock).toHaveBeenCalledTimes(1);
      expect(infoMock).toHaveBeenCalledWith(
        `Temporarily overriding GIT_SSH_COMMAND=${sshCommand}`
      );
      expect(setEnvironmentVariableMock).toHaveBeenCalledTimes(1);
      expect(setEnvironmentVariableMock).toHaveBeenCalledWith(
        `GIT_SSH_COMMAND`,
        sshCommand
      );
      expect(configMock).toHaveBeenCalledTimes(2);
      expect(configMock).toHaveBeenCalledWith('core.sshCommand', sshCommand);
      expect(configMock).toHaveBeenCalledWith(
        'http.https://www.github.com.au/.extraheader',
        'AUTHORIZATION: basic ***',
        undefined
      );
      // configureToken()
    });
  });
  describe('Test removeAuth function', (): void => {});
});
/* eslint-enable @typescript-eslint/no-explicit-any */
