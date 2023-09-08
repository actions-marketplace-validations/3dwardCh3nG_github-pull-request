import * as core from '@actions/core';
import { GithubClient, Pull } from '../src/github-client';
import { WorkflowUtils } from '../src/workflow-utils';
import { Octokit } from '@octokit/core';
import { OctokitOptions } from '@octokit/core/dist-types/types';
import PluginRestEndpointMethods from '@octokit/plugin-rest-endpoint-methods';
import { IInputs } from '../src/inputs';
import { ICreateOrUpdatePullRequestBranchResult } from '../src/service';
import { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';

const apiRestPullsCreateMock: jest.Mock = jest.fn();
const apiRestPullsListMock: jest.Mock = jest.fn();
const apiRestPullsUpdateMock: jest.Mock = jest.fn();
const apiMock: Api = getApiMock();
const infoMock = jest.spyOn(core, 'info');

jest.mock('../src/workflow-utils', () => {
  return {
    WorkflowUtils: jest.fn().mockImplementation(() => {
      const getErrorMessageActual = function (error: unknown): string {
        if (error instanceof Error) return error.message;
        return String(error);
      };

      return {
        getErrorMessage: getErrorMessageActual
      };
    })
  };
});
jest.mock('@octokit/core', () => {
  return {
    Octokit: jest.fn().mockImplementation((options: OctokitOptions) => {})
  };
});
jest.mock('@octokit/plugin-rest-endpoint-methods', () => {
  return {
    restEndpointMethods: jest
      .fn()
      .mockImplementation((octokit: Octokit) => apiMock)
  };
});

describe('Test github-client.ts', (): void => {
  let restEndpointMethodsSpy: jest.SpyInstance;

  describe('Test constructor', (): void => {
    beforeEach((): void => {
      restEndpointMethodsSpy = jest.spyOn(
        PluginRestEndpointMethods,
        'restEndpointMethods'
      );
    });

    afterEach((): void => {
      delete process.env['GITHUB_API_URL'];
    });

    it('should create a new instance of GithubClient', (): void => {
      process.env['GITHUB_API_URL'] = 'GITHUB_API_URL';

      const githubClient: GithubClient = new GithubClient('token');

      expect(githubClient).toBeInstanceOf(GithubClient);
      expect(WorkflowUtils).toHaveBeenCalledTimes(1);
      expect(Octokit).toHaveBeenCalledWith({
        auth: 'token',
        baseUrl: 'GITHUB_API_URL'
      } as OctokitOptions);
      expect(restEndpointMethodsSpy).toHaveBeenCalledTimes(1);
      expect(restEndpointMethodsSpy).toHaveBeenCalledWith(expect.any(Octokit));
    });

    it('should create a new instance of GithubClient with default GITHUB_API_URL and no token', (): void => {
      const githubClient: GithubClient = new GithubClient('');

      expect(githubClient).toBeInstanceOf(GithubClient);
      expect(WorkflowUtils).toHaveBeenCalledTimes(1);
      expect(Octokit).toHaveBeenCalledWith({
        baseUrl: 'https://api.github.com'
      } as OctokitOptions);
    });
  });

  describe('Test preparePullRequest function', (): void => {
    beforeAll((): void => {
      restEndpointMethodsSpy = jest.spyOn(
        PluginRestEndpointMethods,
        'restEndpointMethods'
      );
    });

    it('should create a PR and return Pull object', async (): Promise<void> => {
      const githubClient: GithubClient = new GithubClient('');
      const inputs: IInputs = {
        GITHUB_TOKEN: 'GITHUB_TOKEN',
        REPO_OWNER: 'REPO_OWNER',
        REPO_NAME: 'REPO_NAME',
        SOURCE_BRANCH_NAME: 'SOURCE_BRANCH_NAME',
        TARGET_BRANCH_NAME: 'TARGET_BRANCH_NAME',
        PR_TITLE: 'PR_TITLE',
        DRAFT: false,
        REQUIRE_MIDDLE_BRANCH: false,
        AUTO_MERGE: false,
        MERGE_METHOD: 'merge',
        MAX_MERGE_RETRIES: 60,
        MERGE_RETRY_INTERVAL: 60,
        SIGNOFF: false
      } as IInputs;
      const result: ICreateOrUpdatePullRequestBranchResult = {
        action: 'created',
        sourceBranch: 'sourceBranch',
        targetBranch: 'targetBranch',
        hasDiffWithTargetBranch: false,
        headSha: ''
      } as ICreateOrUpdatePullRequestBranchResult;
      const pull: Pull = {
        number: 1,
        html_url: 'html_url',
        created: true
      } as Pull;

      const createOrUpdatePullRequestSpy: jest.SpyInstance = jest
        .spyOn(githubClient, 'createOrUpdatePullRequest')
        .mockImplementation(
          (inputs: IInputs, result: ICreateOrUpdatePullRequestBranchResult) => {
            return Promise.resolve(pull);
          }
        );
      const updateIssuesSpy: jest.SpyInstance = jest
        .spyOn(githubClient, 'updateIssues')
        .mockImplementation((inputs: IInputs, pull: Pull) => {
          return Promise.resolve();
        });

      const pullRequest: Pull = await githubClient.preparePullRequest(
        inputs,
        result
      );

      expect(pullRequest).toEqual(pull);
      expect(createOrUpdatePullRequestSpy).toHaveBeenCalledTimes(1);
      expect(createOrUpdatePullRequestSpy).toHaveBeenCalledWith(inputs, result);
      expect(updateIssuesSpy).toHaveBeenCalledTimes(1);
      expect(updateIssuesSpy).toHaveBeenCalledWith(inputs, pull);
    });
  });

  describe('Test createOrUpdatePullRequest function', (): void => {
    const inputs: IInputs = {
      GITHUB_TOKEN: 'GITHUB_TOKEN',
      REPO_OWNER: 'REPO_OWNER',
      REPO_NAME: 'REPO_NAME',
      SOURCE_BRANCH_NAME: 'SOURCE_BRANCH_NAME',
      TARGET_BRANCH_NAME: 'TARGET_BRANCH_NAME',
      PR_TITLE: 'PR_TITLE',
      PR_BODY: 'PR_BODY',
      DRAFT: false,
      REQUIRE_MIDDLE_BRANCH: false,
      AUTO_MERGE: false,
      MERGE_METHOD: 'merge',
      MAX_MERGE_RETRIES: 60,
      MERGE_RETRY_INTERVAL: 60,
      SIGNOFF: false
    } as IInputs;
    const result: ICreateOrUpdatePullRequestBranchResult = {
      action: 'created',
      sourceBranch: 'sourceBranch',
      targetBranch: 'targetBranch',
      hasDiffWithTargetBranch: false,
      headSha: ''
    } as ICreateOrUpdatePullRequestBranchResult;

    it('should create a PR and return Pull object', async (): Promise<void> => {
      apiRestPullsCreateMock.mockImplementation(
        (input: {
          owner: string;
          repo: string;
          title: string;
          body: string;
          draft: boolean;
          head: string;
          head_repo: string;
          base: string;
        }): any => {
          return {
            data: {
              number: 1,
              head: {
                sha: 'sha_1'
              },
              html_url: 'html_url_1'
            }
          };
        }
      );

      const githubClient: GithubClient = new GithubClient('');

      const pull: Pull = await githubClient.createOrUpdatePullRequest(
        inputs,
        result
      );

      expect(pull).toEqual({
        number: 1,
        sha: 'sha_1',
        html_url: 'html_url_1',
        action: 'created',
        created: true,
        merged: false
      } as Pull);
      expect(infoMock).toHaveBeenCalledTimes(1);
      expect(apiRestPullsCreateMock).toHaveBeenCalledTimes(1);
      expect(apiRestPullsListMock).toHaveBeenCalledTimes(0);
      expect(apiRestPullsUpdateMock).toHaveBeenCalledTimes(0);
    });

    it('should update a PR when exists and return Pull object', async (): Promise<void> => {
      result.action = 'updated';
      apiRestPullsCreateMock.mockImplementation(
        (input: {
          owner: string;
          repo: string;
          title: string;
          body: string;
          draft: boolean;
          head: string;
          head_repo: string;
          base: string;
        }): any => {
          throw Error('A pull request already exists for');
        }
      );
      apiRestPullsListMock.mockImplementation(
        (input: {
          owner: string;
          repo: string;
          state: string;
          head: string;
          base: string;
        }): any => {
          return {
            data: [
              {
                number: 1,
                head: {
                  sha: 'sha_1'
                },
                html_url: 'html_url_1'
              },
              {
                number: 2,
                head: {
                  sha: 'sha_2'
                },
                html_url: 'html_url_2'
              }
            ]
          };
        }
      );
      apiRestPullsUpdateMock.mockImplementation(
        (input: {
          owner: string;
          repo: string;
          pull_number: number;
          title: string;
          body: string;
        }): any => {
          return {
            data: {
              number: 1,
              head: {
                sha: 'sha_1'
              },
              html_url: 'html_url_1'
            }
          };
        }
      );

      const githubClient: GithubClient = new GithubClient('');

      const pull: Pull = await githubClient.createOrUpdatePullRequest(
        inputs,
        result
      );

      expect(pull).toEqual({
        number: 1,
        sha: 'sha_1',
        html_url: 'html_url_1',
        action: 'updated',
        created: false,
        merged: false
      } as Pull);
      expect(infoMock).toHaveBeenCalledTimes(5);
      expect(apiRestPullsCreateMock).toHaveBeenCalledTimes(1);
      expect(apiRestPullsListMock).toHaveBeenCalledTimes(1);
      expect(apiRestPullsUpdateMock).toHaveBeenCalledTimes(1);
    });
  });
});

function getApiMock(): Api {
  return {
    rest: {
      pulls: {
        create: apiRestPullsCreateMock,
        list: apiRestPullsListMock,
        update: apiRestPullsUpdateMock
      }
    } as any
  } as Api;
}
