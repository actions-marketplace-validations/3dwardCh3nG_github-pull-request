import * as core from '@actions/core';
import * as index from '../src/index';
import * as inputs from '../src/inputs';
import { IInputs } from '../src/inputs';
import * as service from '../src/service';
import * as github from '../src/github-client';
import { Pull } from '../src/github-client';
import { createWorkflowUtils, IWorkflowUtils } from '../src/workflow-utils';

const infoMock = jest.spyOn(core, 'info');
const setOutputMock = jest.spyOn(core, 'setOutput');
const setFailedMock = jest.spyOn(core, 'setFailed');
const startGroupMock = jest.spyOn(core, 'startGroup');
const endGroupMock = jest.spyOn(core, 'endGroup');
const prepareInputValuesMock = jest.spyOn(inputs, 'prepareInputValues');
let createServiceMock: jest.SpyInstance<service.IService, [IInputs]>;
const createPullRequestMock = jest
  .fn()
  .mockImplementation(async (): Promise<github.Pull> => {
    return {
      number: 1,
      sha: 'sha',
      html_url: 'url',
      action: 'created',
      created: true,
      merged: false
    } as github.Pull;
  });

const createPullRequestThrowErrorMock = jest
  .fn()
  .mockImplementation(async (): Promise<github.Pull> => {
    throw new Error('test error');
  });

const mergePullRequestWithRetriesMock = jest
  .fn()
  .mockImplementation((pullRequest: Pull): Promise<Pull> => {
    return Promise.resolve(pullRequest);
  });

const mergePullRequestWithRetriesThrowErrorMock = jest
  .fn()
  .mockImplementation((pullRequest: Pull): Promise<Pull> => {
    throw new Error('test error');
  });

describe('Test index.ts', () => {
  let workflowUtils: IWorkflowUtils;

  beforeAll(() => {
    workflowUtils = createWorkflowUtils();
  });

  describe('Test run function', () => {
    it('should call createPullRequest only when AUTO_MERGE is false', async () => {
      createServiceMock = jest
        .spyOn(service, 'createService')
        .mockImplementation(
          (i: IInputs): service.IService => createService(i, false, false)
        );

      prepareInputValuesMock.mockImplementation(() =>
        getInputsWithAutoMergeValues(false)
      );

      await index.run();

      verifyMocks();
      expect(mergePullRequestWithRetriesMock).toBeCalledTimes(0);
    });

    it('should call createPullRequest and mergePullRequestWithRetries only when AUTO_MERGE is true', async () => {
      createServiceMock = jest
        .spyOn(service, 'createService')
        .mockImplementation(
          (i: IInputs): service.IService => createService(i, false, false)
        );

      prepareInputValuesMock.mockImplementation(() =>
        getInputsWithAutoMergeValues(true)
      );

      await index.run();

      verifyMocks();
      expect(mergePullRequestWithRetriesMock).toBeCalledTimes(1);
    });

    it('should throw error when createPullRequest throws error', async () => {
      createServiceMock = jest
        .spyOn(service, 'createService')
        .mockImplementation(
          (i: IInputs): service.IService => createService(i, true, true)
        );

      prepareInputValuesMock.mockImplementation(() =>
        getInputsWithAutoMergeValues(false)
      );

      await index.run();

      verifyMocksWithError();
      expect(createPullRequestMock).toBeCalledTimes(0);
      expect(createPullRequestThrowErrorMock).toBeCalledTimes(1);
      expect(mergePullRequestWithRetriesMock).toBeCalledTimes(0);
      expect(mergePullRequestWithRetriesThrowErrorMock).toBeCalledTimes(0);
    });

    it('should throw error when mergePullRequestWithRetries throws error', async () => {
      createServiceMock = jest
        .spyOn(service, 'createService')
        .mockImplementation(
          (i: IInputs): service.IService => createService(i, false, true)
        );

      prepareInputValuesMock.mockImplementation(() =>
        getInputsWithAutoMergeValues(true)
      );

      await index.run();

      verifyMocksWithError();
      expect(createPullRequestMock).toBeCalledTimes(1);
      expect(createPullRequestThrowErrorMock).toBeCalledTimes(0);
      expect(mergePullRequestWithRetriesMock).toBeCalledTimes(0);
      expect(mergePullRequestWithRetriesThrowErrorMock).toBeCalledTimes(1);
    });
  });
});

function createService(
  inputs: IInputs,
  createPullRequestThrowError: boolean,
  mergePullRequestWithRetriesThrowError: boolean
): service.IService {
  return {
    createPullRequest: !createPullRequestThrowError
      ? createPullRequestMock
      : createPullRequestThrowErrorMock,
    mergePullRequestWithRetries: !mergePullRequestWithRetriesThrowError
      ? mergePullRequestWithRetriesMock
      : mergePullRequestWithRetriesThrowErrorMock
  } as service.IService;
}

function getInputsWithAutoMergeValues(autoMerge: boolean): inputs.IInputs {
  return {
    GITHUB_TOKEN: 'token',
    REPO_OWNER: '3dwardch3ng',
    REPO_NAME: 'github-pull-request',
    REMOTE_NAME: 'origin',
    SOURCE_BRANCH_NAME: 'source-branch',
    TARGET_BRANCH_NAME: 'target-branch',
    PR_TITLE: 'test-pr-title',
    PR_BODY: 'test-pr-title',
    DRAFT: false,
    REQUIRE_MIDDLE_BRANCH: false,
    AUTO_MERGE: autoMerge,
    MERGE_METHOD: 'merge',
    MAX_MERGE_RETRIES: 60,
    MERGE_RETRY_INTERVAL: 60,
    MILESTONE: undefined,
    ASSIGNEES: undefined,
    REVIEWERS: undefined,
    REAM_REVIEWERS: undefined,
    LABELS: undefined,
    SIGNOFF: undefined
  } as IInputs;
}

function verifyMocks() {
  expect(prepareInputValuesMock).toBeCalledTimes(1);
  expect(createServiceMock).toBeCalledTimes(1);
  expect(setOutputMock).toBeCalledTimes(6);
  expect(setFailedMock).toBeCalledTimes(0);
  expect(startGroupMock).toBeCalledTimes(1);
  expect(endGroupMock).toBeCalledTimes(1);
  expect(createPullRequestMock).toBeCalledTimes(1);
}

function verifyMocksWithError() {
  expect(prepareInputValuesMock).toBeCalledTimes(1);
  expect(createServiceMock).toBeCalledTimes(1);
  expect(setOutputMock).toBeCalledTimes(0);
  expect(setFailedMock).toBeCalledTimes(1);
  expect(startGroupMock).toBeCalledTimes(0);
  expect(endGroupMock).toBeCalledTimes(0);
}
