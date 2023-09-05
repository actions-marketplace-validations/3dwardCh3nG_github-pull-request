import { createWorkflowUtils, IWorkflowUtils } from './workflow-utils';
import * as core from '@actions/core';
import { createService, IService } from './service';
import { Pull } from './github-client';
import { IInputs, prepareInputValues } from './inputs';

export const run = async (): Promise<void> => {
  const workflowUtils: IWorkflowUtils = createWorkflowUtils();

  try {
    const inputs: IInputs = prepareInputValues();
    const service: IService = createService(inputs);

    let pullRequest: Pull = await service.createPullRequest();
    if (inputs.AUTO_MERGE) {
      pullRequest = await service.mergePullRequestWithRetries(pullRequest);
    }

    core.startGroup('Setting outputs');
    core.setOutput('pull-request-number', pullRequest.number);
    core.setOutput('pull-request-url', pullRequest.html_url);
    core.setOutput('pull-request-operation', pullRequest.action);
    core.setOutput('pull-request-created', pullRequest.created);
    core.setOutput('pull-request-head-sha', pullRequest.sha);
    core.setOutput('pull-request-merged', pullRequest.merged);

    core.endGroup();
  } catch (error) {
    core.setFailed(workflowUtils.getErrorMessage(error));
  }
};

// eslint-disable-next-line github/no-then
run().then(() => core.info('Action finished successfully'));
