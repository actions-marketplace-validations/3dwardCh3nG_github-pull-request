import * as core from '@actions/core';
import {
  createGitCommandManager,
  GitCommandManager,
  IGitCommandManager
} from '../src/git-command-manager';
import * as GitCommandManagerModule from '../src/git-command-manager';
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
  undefined
);

const setSecretSpy: jest.SpyInstance<any, any> = jest.spyOn(core, 'setSecret');

jest.mock('../src/git-command-manager', () => {
  const gitCommandManagerMock: GitCommandManager = {
    ...jest.requireActual('../src/git-command-manager').GitCommandManager,
    config: jest.fn(),
    configExists: jest.fn(),
    unsetConfig: jest.fn(),
    getGitDirectory: jest.fn(),
    getWorkingDirectory: jest.fn().mockImplementation((): string => {
      return 'workingDirectory';
    })
  } as GitCommandManager;
  return {
    GitCommandManager: gitCommandManagerMock,
    createGitCommandManager: jest.fn().mockImplementation(async () => {
      return Promise.resolve(gitCommandManagerMock);
    })
  };
});

describe('Test git-auth-helper.ts', (): void => {
  let gitCommanderManager: IGitCommandManager;

  beforeAll(async (): Promise<void> => {
    gitCommanderManager = await createGitCommandManager(repositoryPath);
  });

  describe('Test constructor', (): void => {
    it('should create an instance with initialised values', (): void => {
      // const basicCredential: string = Buffer.from(
      //   `x-access-token:authToken`,
      //   'utf8'
      // ).toString('base64');
      // const gitCommandManager: GitCommandManager = (
      //   jest.createMockFromModule('../src/git-command-manager') as {
      //     createGitCommandManager: Function;
      //     GitCommandManager: GitCommandManager;
      //   }
      // ).GitCommandManager;
      // const getWorkingDirectoryMock = jest
      //   .spyOn(gitCommandManager, 'getWorkingDirectory')
      //   .mockImplementation((): string => {
      //     return 'workingDirectory';
      //   });
      const gitAuthHelper: IGitAuthHelper = new GitAuthHelper(
        gitCommanderManager,
        gitSourceSettings
      );
      expect(gitAuthHelper).toBeDefined();
      // expect(getWorkingDirectoryMock).toHaveBeenCalledTimes(1);
      expect(gitAuthHelper.tokenConfigKey).toEqual(
        'http.https://github.com/.extraheader'
      );
      // expect(setSecretSpy).toHaveBeenCalledTimes(1);
      // expect(setSecretSpy).toHaveBeenCalledWith(basicCredential);
      // expect(gitAuthHelper.tokenConfigValue).toEqual(
      //   `AUTHORIZATION: basic ${basicCredential}`
      // );
    });
  });

  // describe('Test configureAuth function', (): void => {
  //   const configExistsFuncMock: jest.SpyInstance<Promise<boolean>> = jest
  //     .spyOn(GitCommandManager.prototype, 'configExists')
  //     .mockImplementation(() => {
  //       return Promise.resolve(true);
  //     });
  //   const unsetConfigFuncMock: jest.SpyInstance<Promise<boolean>> = jest
  //     .spyOn(GitCommandManager.prototype, 'unsetConfig')
  //     .mockImplementation(() => {
  //       return Promise.resolve(true);
  //     });
  //
  //   it('should call removeAuth and configureToken and success', async (): Promise<void> => {
  //     const gitAuthHelper: IGitAuthHelper = new GitAuthHelper(
  //       gitCommanderManager,
  //       gitSourceSettings
  //     );
  //     await gitAuthHelper.configureAuth();
  //     expect(configExistsFuncMock).toHaveBeenCalledTimes(1);
  //     expect(configExistsFuncMock).toHaveBeenCalledWith('http.');
  //     expect(unsetConfigFuncMock).toHaveBeenCalledTimes(1);
  //     expect(unsetConfigFuncMock).toHaveBeenCalledWith();
  //
  //     // info +1
  //   });
  // });
  describe('Test removeAuth function', (): void => {});
});

function getGitCommandManagerMock(): GitCommandManager {
  return {
    ...jest.requireActual('../src/git-command-manager').GitCommandManager,
    config: jest.fn(),
    configExists: jest.fn(),
    unsetConfig: jest.fn(),
    getWorkingDirectory: jest.fn()
  } as GitCommandManager;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
