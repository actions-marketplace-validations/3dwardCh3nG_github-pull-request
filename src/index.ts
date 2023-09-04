import { createWorkflowUtils, IWorkflowUtils } from './workflow-utils';
import * as core from '@actions/core';
import { createService, IService } from './service';

export const run = async (): Promise<void> => {
  const workflowUtils: IWorkflowUtils = createWorkflowUtils();
  const service: IService = createService();

  try {
    await service.createPullRequest();
  } catch (error) {
    core.setFailed(workflowUtils.getErrorMessage(error));
  }
};

// eslint-disable-next-line github/no-then
run().then(() => core.info('Action finished successfully'));
