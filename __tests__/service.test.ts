import { IInputs, prepareInputValues } from '../src/inputs';
import {
  createService,
  ICreateOrUpdatePullRequestBranchResult,
  IService,
  Service
} from '../src/service';
import { WorkflowUtils } from '../src/workflow-utils';
import { GithubClient, Pull } from '../src/github-client';
import { GitCommandManager } from '../src/git-command-manager';
import {
  GitSourceSettings,
  IGitSourceSettings
} from '../src/git-source-settings';
import * as core from '@actions/core';
import { ErrorMessages } from '../src/message';

const infoMock: jest.SpyInstance<void, [message: string]> = jest.spyOn(
  core,
  'info'
);
const startGroupMock: jest.SpyInstance<void, [name: string]> = jest.spyOn(
  core,
  'startGroup'
);
const endGroupMock: jest.SpyInstance<void, []> = jest.spyOn(core, 'endGroup');
const setFailedMock: jest.SpyInstance<void, [message: string | Error]> =
  jest.spyOn(core, 'setFailed');
const getErrorMessageMock: jest.Mock<any, any, any> = jest
  .fn()
  .mockImplementation((error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  });
const fileExistsSyncMock: jest.Mock<any, any, any> = jest.fn();
const getRepoPathMock: jest.Mock<any, any, any> = jest.fn();
jest.mock('../src/workflow-utils', () => {
  return {
    ...jest.requireActual('../src/workflow-utils'),
    WorkflowUtils: jest.fn().mockImplementation(() => {
      return {
        getErrorMessage: getErrorMessageMock,
        fileExistsSync: fileExistsSyncMock,
        getRepoPath: getRepoPathMock
      };
    })
  };
});
const gitCommandManagerCreateFunctionMock: jest.Mock<any, any> = jest
  .fn()
  .mockImplementation(async (workingDir: string) => {
    const gitCommandManager: GitCommandManager = new GitCommandManager();
    await gitCommandManager.init(workingDir);
    return gitCommandManager;
  });
const initMock: jest.Mock<any, any, any> = jest.fn();
const getRepoRemoteUrlMock: jest.Mock<any, any, any> = jest.fn();
const getRemoteDetailMock: jest.Mock<any, any, any> = jest.fn();
const getWorkingBaseAndTypeMock: jest.Mock<any, any, any> = jest.fn();
const stashPushMock: jest.Mock<any, any, any> = jest.fn();
const fetchRemoteMock: jest.Mock<any, any, any> = jest.fn();
const checkoutMock: jest.Mock<any, any, any> = jest.fn();
const pullMock: jest.Mock<any, any, any> = jest.fn();
const fetchMock: jest.Mock<any, any, any> = jest.fn();
const isAheadMock: jest.Mock<any, any, any> = jest.fn();
const revParseMock: jest.Mock<any, any, any> = jest.fn();
const deleteBranchMock: jest.Mock<any, any, any> = jest.fn();
const pushMock: jest.Mock<any, any, any> = jest.fn();
const stashPopMock: jest.Mock<any, any, any> = jest.fn();
const commitsAheadMock: jest.Mock<any, any, any> = jest.fn();
const hasDiffMock: jest.Mock<any, any, any> = jest.fn();
const isEvenMock: jest.Mock<any, any, any> = jest.fn();
jest.mock('../src/git-command-manager', () => {
  return {
    ...jest.requireActual('../src/git-command-manager'),
    GitCommandManager: jest.fn().mockImplementation(() => {
      new WorkflowUtils();
      return {
        init: initMock,
        getRepoRemoteUrl: getRepoRemoteUrlMock,
        getRemoteDetail: getRemoteDetailMock,
        getWorkingBaseAndType: getWorkingBaseAndTypeMock,
        stashPush: stashPushMock,
        fetchRemote: fetchRemoteMock,
        checkout: checkoutMock,
        pull: pullMock,
        fetch: fetchMock,
        isAhead: isAheadMock,
        revParse: revParseMock,
        deleteBranch: deleteBranchMock,
        push: pushMock,
        stashPop: stashPopMock,
        commitsAhead: commitsAheadMock,
        hasDiff: hasDiffMock,
        isEven: isEvenMock
      };
    })
  };
});
jest.mock('../src/service', () => {
  return {
    createService: jest.fn().mockImplementation((inputs: IInputs) => {
      return new Service(inputs);
    }),
    Service: jest.fn().mockImplementation((inputs: IInputs) => {
      new WorkflowUtils();
      new GithubClient(inputs.GITHUB_TOKEN);
      return {
        createPullRequest: jest.fn(),
        mergePullRequestWithRetries: jest.fn()
      };
    })
  };
});
const preparePullRequestMock: jest.Mock<any, any, any> = jest.fn();
jest.mock('../src/github-client', () => {
  return {
    GithubClient: jest.fn().mockImplementation((githubToken: string) => {
      return {
        preparePullRequest: preparePullRequestMock
      };
    })
  };
});
const configureAuthMock: jest.Mock<any, any, any> = jest.fn();
const removeAuthMock: jest.Mock<any, any, any> = jest.fn();
jest.mock('../src/git-auth-helper', () => {
  return {
    GitAuthHelper: jest.fn().mockImplementation(() => {
      return {
        configureAuth: configureAuthMock,
        removeAuth: removeAuthMock
      };
    })
  };
});
jest.mock('../src/git-source-settings', () => {
  return {
    GitSourceSettings: jest.fn().mockImplementation(() => {
      return {
        repositoryPath: 'repositoryPath',
        repositoryOwner: 'repositoryOwner',
        repositoryName: 'repositoryName',
        authToken: 'authToken',
        githubServerUrl: undefined,
        workflowOrganizationId: '1234567890',
        sshKey: undefined,
        sshKnownHosts: undefined,
        sshStrict: false,
        persistCredentials: false
      } as IGitSourceSettings;
    })
  };
});

describe('Test service.ts', (): void => {
  describe('Test createService function', (): void => {
    it('should return a new Service object', (): void => {
      setRequiredProcessEnvValues();
      setOptionalProcessEnvValues();
      const inputs: IInputs = prepareInputValues();

      const service: IService = createService(inputs);

      expect(service).toBeDefined();
      expect(Service).toHaveBeenCalledTimes(1);
      expect(Service).toHaveBeenCalledWith(inputs);
      expect(WorkflowUtils).toHaveBeenCalledTimes(1);
      expect(GithubClient).toHaveBeenCalledTimes(1);
      expect(GithubClient).toHaveBeenCalledWith(inputs.GITHUB_TOKEN);
    });
  });

  describe('Test Service class', (): void => {
    const pull: Pull = {
      number: 1,
      sha: 'sha',
      html_url: 'html_url',
      action: 'created',
      created: true,
      merged: false
    } as Pull;
    let ServiceModule: typeof import('../src/service');

    beforeAll((): void => {
      ServiceModule = jest.requireActual('../src/service');
      getRepoPathMock.mockReturnValue('repoPath');
      GitCommandManager.create = gitCommandManagerCreateFunctionMock;
      getRepoRemoteUrlMock.mockReturnValue('repoRemoteUrl');
      getRemoteDetailMock.mockReturnValue({
        hostname: 'www.github.com',
        protocol: 'HTTPS',
        repository: '3dwardch3ng/create-pull-request'
      });
      stashPushMock.mockReturnValue(true);
      revParseMock.mockReturnValue('sha');
      preparePullRequestMock.mockReturnValue(pull);
    });

    describe('Test createPullRequest function', (): void => {
      it('should success when calling createPullRequest function when PR branch not exists', async (): Promise<void> => {
        getWorkingBaseAndTypeMock.mockReturnValue({
          workingBase: 'develop',
          workingBaseType: 'branch'
        });
        fetchMock.mockReturnValue(false);
        isAheadMock.mockReturnValue(true);

        setRequiredProcessEnvValues();
        setOptionalProcessEnvValues();
        delete process.env['INPUT_REQUIRE_MIDDLE_BRANCH'];
        const inputs: IInputs = prepareInputValues();
        const service: IService = ServiceModule.createService(inputs);

        const result: Pull = await service.createPullRequest();

        expect(getRepoPathMock).toHaveBeenCalledTimes(1);
        expect(gitCommandManagerCreateFunctionMock).toHaveBeenCalledTimes(1);
        expect(GitSourceSettings).toHaveBeenCalledTimes(1);
        expect(infoMock).toHaveBeenCalledTimes(4);
        expect(startGroupMock).toHaveBeenCalledTimes(3);
        expect(endGroupMock).toHaveBeenCalledTimes(3);
        expect(getWorkingBaseAndTypeMock).toHaveBeenCalledTimes(1);
        expect(stashPushMock).toHaveBeenCalledTimes(1);
        expect(fetchRemoteMock).toHaveBeenCalledTimes(1);
        expect(checkoutMock).toHaveBeenCalledTimes(4);
        expect(pullMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(isAheadMock).toHaveBeenCalledTimes(1);
        expect(revParseMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledTimes(1);
        expect(pushMock).toHaveBeenCalledTimes(1);
        expect(stashPopMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledWith(inputs, {
          action: 'created',
          sourceBranch: 'source-branch',
          targetBranch: 'target-branch',
          hasDiffWithTargetBranch: true,
          headSha: 'sha'
        } as ICreateOrUpdatePullRequestBranchResult);
        expect(removeAuthMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual(pull);
      });

      it('should success when calling createPullRequest function when PR branch not exists but has no difference with the target branch', async (): Promise<void> => {
        getWorkingBaseAndTypeMock.mockReturnValue({
          workingBase: 'develop',
          workingBaseType: 'branch'
        });
        fetchMock.mockReturnValue(false);
        isAheadMock.mockReturnValue(false);

        setRequiredProcessEnvValues();
        setOptionalProcessEnvValues();
        delete process.env['INPUT_REQUIRE_MIDDLE_BRANCH'];
        const inputs: IInputs = prepareInputValues();
        const service: IService = ServiceModule.createService(inputs);

        const result: Pull = await service.createPullRequest();

        expect(getRepoPathMock).toHaveBeenCalledTimes(1);
        expect(gitCommandManagerCreateFunctionMock).toHaveBeenCalledTimes(1);
        expect(GitSourceSettings).toHaveBeenCalledTimes(1);
        expect(infoMock).toHaveBeenCalledTimes(4);
        expect(startGroupMock).toHaveBeenCalledTimes(1);
        expect(endGroupMock).toHaveBeenCalledTimes(1);
        expect(getWorkingBaseAndTypeMock).toHaveBeenCalledTimes(1);
        expect(stashPushMock).toHaveBeenCalledTimes(1);
        expect(fetchRemoteMock).toHaveBeenCalledTimes(1);
        expect(checkoutMock).toHaveBeenCalledTimes(4);
        expect(pullMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(isAheadMock).toHaveBeenCalledTimes(1);
        expect(revParseMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledTimes(1);
        expect(pushMock).toHaveBeenCalledTimes(0);
        expect(stashPopMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledTimes(0);
        expect(removeAuthMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          number: 0,
          sha: '',
          html_url: '',
          action: '',
          created: false,
          merged: false
        } as Pull);
      });

      it('should success when calling createPullRequest function when PR branch already exists', async (): Promise<void> => {
        let tempBranchName: string = '';
        getWorkingBaseAndTypeMock.mockReturnValue({
          workingBase: 'sha',
          workingBaseType: 'commit'
        });
        fetchMock.mockReturnValue(true);
        hasDiffMock.mockReturnValue(false);
        commitsAheadMock.mockImplementation(
          (branch1: string, branch2: string) => {
            if (branch1 === 'target-branch') {
              if (
                branch2 !== 'source-branch' &&
                !branch2.includes('-merge-to-')
              ) {
                tempBranchName = branch2;
              }
              return 0;
            }
            return 0;
          }
        );
        isEvenMock.mockReturnValue(false);
        isAheadMock.mockReturnValue(true);

        setRequiredProcessEnvValues();
        setOptionalProcessEnvValues();
        const inputs: IInputs = prepareInputValues();
        const service: IService = ServiceModule.createService(inputs);

        const result: Pull = await service.createPullRequest();

        expect(getRepoPathMock).toHaveBeenCalledTimes(1);
        expect(gitCommandManagerCreateFunctionMock).toHaveBeenCalledTimes(1);
        expect(GitSourceSettings).toHaveBeenCalledTimes(1);
        expect(infoMock).toHaveBeenCalledTimes(5);
        expect(startGroupMock).toHaveBeenCalledTimes(3);
        expect(endGroupMock).toHaveBeenCalledTimes(3);
        expect(getWorkingBaseAndTypeMock).toHaveBeenCalledTimes(1);
        expect(stashPushMock).toHaveBeenCalledTimes(1);
        expect(fetchRemoteMock).toHaveBeenCalledTimes(1);
        expect(checkoutMock).toHaveBeenCalledTimes(5);
        expect(pullMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(isAheadMock).toHaveBeenCalledTimes(1);
        expect(revParseMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledWith(tempBranchName, [
          '--force'
        ]);
        expect(pushMock).toHaveBeenCalledTimes(1);
        expect(stashPopMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledWith(inputs, {
          action: 'updated',
          sourceBranch: 'source-branch',
          targetBranch: 'source-branch-merge-to-target-branch',
          hasDiffWithTargetBranch: true,
          headSha: 'sha'
        } as ICreateOrUpdatePullRequestBranchResult);
        expect(removeAuthMock).toHaveBeenCalledTimes(1);
        expect(commitsAheadMock).toHaveBeenCalledTimes(2);
        expect(hasDiffMock).toHaveBeenCalledTimes(1);
        expect(isEvenMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual(pull);
      });

      it('should success when calling createPullRequest function when PR branch already exists but no code difference', async (): Promise<void> => {
        let tempBranchName: string = '';
        getWorkingBaseAndTypeMock.mockReturnValue({
          workingBase: 'sha',
          workingBaseType: 'commit'
        });
        fetchMock.mockReturnValue(true);
        hasDiffMock.mockReturnValue(false);
        commitsAheadMock.mockImplementation(
          (branch1: string, branch2: string) => {
            if (branch1 === 'target-branch') {
              if (
                branch2 !== 'source-branch' &&
                !branch2.includes('-merge-to-')
              ) {
                tempBranchName = branch2;
              }
              return 0;
            }
            return 0;
          }
        );
        isEvenMock.mockReturnValue(true);
        isAheadMock.mockReturnValue(true);

        setRequiredProcessEnvValues();
        setOptionalProcessEnvValues();
        const inputs: IInputs = prepareInputValues();
        const service: IService = ServiceModule.createService(inputs);

        const result: Pull = await service.createPullRequest();

        expect(getRepoPathMock).toHaveBeenCalledTimes(1);
        expect(gitCommandManagerCreateFunctionMock).toHaveBeenCalledTimes(1);
        expect(GitSourceSettings).toHaveBeenCalledTimes(1);
        expect(infoMock).toHaveBeenCalledTimes(5);
        expect(startGroupMock).toHaveBeenCalledTimes(2);
        expect(endGroupMock).toHaveBeenCalledTimes(2);
        expect(getWorkingBaseAndTypeMock).toHaveBeenCalledTimes(1);
        expect(stashPushMock).toHaveBeenCalledTimes(1);
        expect(fetchRemoteMock).toHaveBeenCalledTimes(1);
        expect(checkoutMock).toHaveBeenCalledTimes(5);
        expect(pullMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(isAheadMock).toHaveBeenCalledTimes(1);
        expect(revParseMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledWith(tempBranchName, [
          '--force'
        ]);
        expect(pushMock).toHaveBeenCalledTimes(0);
        expect(stashPopMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledWith(inputs, {
          action: 'not-updated',
          sourceBranch: 'source-branch',
          targetBranch: 'source-branch-merge-to-target-branch',
          hasDiffWithTargetBranch: true,
          headSha: 'sha'
        } as ICreateOrUpdatePullRequestBranchResult);
        expect(removeAuthMock).toHaveBeenCalledTimes(1);
        expect(commitsAheadMock).toHaveBeenCalledTimes(2);
        expect(hasDiffMock).toHaveBeenCalledTimes(1);
        expect(isEvenMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual(pull);
      });

      it('should fail the action execution when calling createPullRequest function when there is an error thrown from the inner logic', async (): Promise<void> => {
        let tempBranchName: string = '';
        getWorkingBaseAndTypeMock.mockReturnValue({
          workingBase: 'sha',
          workingBaseType: 'commit'
        });
        fetchMock.mockReturnValue(true);
        hasDiffMock.mockReturnValue(false);
        commitsAheadMock.mockImplementation(
          (branch1: string, branch2: string) => {
            if (branch1 === 'target-branch') {
              if (
                branch2 !== 'source-branch' &&
                !branch2.includes('-merge-to-')
              ) {
                tempBranchName = branch2;
              }
              return 0;
            }
            return 0;
          }
        );
        isEvenMock.mockReturnValue(true);
        isAheadMock.mockReturnValue(true);
        preparePullRequestMock.mockImplementation(() => {
          throw Error('Error when calling githubClient.preparePullRequest');
        });

        setRequiredProcessEnvValues();
        setOptionalProcessEnvValues();
        const inputs: IInputs = prepareInputValues();
        const service: IService = ServiceModule.createService(inputs);

        const result: Pull = await service.createPullRequest();

        expect(getRepoPathMock).toHaveBeenCalledTimes(1);
        expect(gitCommandManagerCreateFunctionMock).toHaveBeenCalledTimes(1);
        expect(GitSourceSettings).toHaveBeenCalledTimes(1);
        expect(infoMock).toHaveBeenCalledTimes(5);
        expect(startGroupMock).toHaveBeenCalledTimes(2);
        expect(endGroupMock).toHaveBeenCalledTimes(1);
        expect(getWorkingBaseAndTypeMock).toHaveBeenCalledTimes(1);
        expect(stashPushMock).toHaveBeenCalledTimes(1);
        expect(fetchRemoteMock).toHaveBeenCalledTimes(1);
        expect(checkoutMock).toHaveBeenCalledTimes(5);
        expect(pullMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(isAheadMock).toHaveBeenCalledTimes(1);
        expect(revParseMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledTimes(1);
        expect(deleteBranchMock).toHaveBeenCalledWith(tempBranchName, [
          '--force'
        ]);
        expect(pushMock).toHaveBeenCalledTimes(0);
        expect(stashPopMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledTimes(1);
        expect(preparePullRequestMock).toHaveBeenCalledWith(inputs, {
          action: 'not-updated',
          sourceBranch: 'source-branch',
          targetBranch: 'source-branch-merge-to-target-branch',
          hasDiffWithTargetBranch: true,
          headSha: 'sha'
        } as ICreateOrUpdatePullRequestBranchResult);
        expect(removeAuthMock).toHaveBeenCalledTimes(1);
        expect(commitsAheadMock).toHaveBeenCalledTimes(2);
        expect(hasDiffMock).toHaveBeenCalledTimes(1);
        expect(isEvenMock).toHaveBeenCalledTimes(1);
        expect(setFailedMock).toHaveBeenCalledTimes(1);
        expect(setFailedMock).toHaveBeenCalledWith(
          'Error when calling githubClient.preparePullRequest'
        );
        expect(result).toEqual({
          number: 0,
          sha: '',
          html_url: '',
          action: '',
          created: false,
          merged: false
        } as Pull);
      });
    });
  });
});

function setRequiredProcessEnvValues(): void {
  process.env['INPUT_GITHUB_TOKEN'] = 'github-token';
  process.env['INPUT_REPO_OWNER'] = '3dwardch3ng';
  process.env['INPUT_REPO_NAME'] = 'github-pull-request';
  process.env['INPUT_SOURCE_BRANCH'] = 'source-branch';
  process.env['INPUT_TARGET_BRANCH'] = 'target-branch';
  process.env['INPUT_PR_TITLE'] = 'pr-title';
}

function setOptionalProcessEnvValues(): void {
  process.env['INPUT_REMOTE_NAME'] = 'remote-name';
  process.env['INPUT_PR_BODY'] = 'pr-body';
  process.env['INPUT_DRAFT'] = 'true';
  process.env['INPUT_REQUIRE_MIDDLE_BRANCH'] = 'true';
  process.env['INPUT_AUTO_MERGE'] = 'true';
  process.env['INPUT_MAX_MERGE_RETRIES'] = '30';
  process.env['INPUT_MERGE_RETRY_INTERVAL'] = '30';
  process.env['INPUT_MILESTONE'] = '2';
  process.env['INPUT_ASSIGNEES'] = '3dwardch3ng';
  process.env['INPUT_REVIEWERS'] = '3dwardch3ng';
  process.env['INPUT_TEAM_REVIEWERS'] = '3dwardch3ng';
  process.env['INPUT_LABELS'] = 'label';
  process.env['INPUT_SIGNOFF'] = 'true';
  process.env['INPUT_MERGE_METHOD'] = 'squash';
}
