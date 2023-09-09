import * as core from '@actions/core';
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
  undefined,
  undefined,
  undefined,
  false,
  false
);

const setSecretSpy: jest.SpyInstance<any, any> = jest.spyOn(core, 'setSecret');
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
const gitCommandManagerMock: GitCommandManager = {
  ...jest.requireActual('../src/git-command-manager').GitCommandManager,
  config: configMock,
  configExists: configExistsMock,
  unsetConfig: unsetConfigMock,
  getGitDirectory: jest.fn(),
  getWorkingDirectory: getWorkingDirectoryMock
} as GitCommandManager;
jest.mock('../src/git-command-manager', () => {
  return {
    GitCommandManager: jest.fn().mockImplementation(async () => {
      return gitCommandManagerMock;
    }),
    createGitCommandManager: jest.fn().mockImplementation(async () => {
      return Promise.resolve(gitCommandManagerMock);
    })
  };
});
jest.mock('fs', () => {
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
  return {
    ...jest.requireActual('fs'),
    promises: {
      ...jest.requireActual('fs/promises'),
      readFile: jest.fn().mockImplementation(async (): Promise<Buffer> => {
        return Promise.resolve(buffer);
      }),
      writeFile: jest.fn()
    }
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
      expect(gitAuthHelper.insteadOfValues).toEqual([`git@github.com:`]);
    });
  });

  describe('Test configureAuth function', (): void => {
    // const configExistsFuncMock: jest.SpyInstance<Promise<boolean>> = jest
    //   .spyOn(GitCommandManager.prototype, 'configExists')
    //   .mockImplementation(() => {
    //     return Promise.resolve(true);
    //   });
    // const unsetConfigFuncMock: jest.SpyInstance<Promise<boolean>> = jest
    //   .spyOn(GitCommandManager.prototype, 'unsetConfig')
    //   .mockImplementation(() => {
    //     return Promise.resolve(true);
    //   });
    // let configExistsFuncMock: jest.SpyInstance<Promise<boolean>>;
    // let unsetConfigFuncMock: jest.SpyInstance<Promise<boolean>>;
    //
    // beforeAll(async (): Promise<void> => {
    //   configExistsFuncMock = jest.spyOn(gitCommandManagerMock, 'configExists');
    //   configExistsFuncMock = jest.spyOn(gitCommandManagerMock, 'unsetConfig');
    // });

    it('should call removeAuth and configureToken and success', async (): Promise<void> => {
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

      // info +1
    });
  });
  describe('Test removeAuth function', (): void => {});
});
/* eslint-enable @typescript-eslint/no-explicit-any */
