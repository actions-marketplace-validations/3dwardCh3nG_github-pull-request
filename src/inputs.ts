import * as core from '@actions/core';

export interface IInputs {
  GITHUB_TOKEN: string;
  REPO_OWNER: string;
  REPO_NAME: string;
  REMOTE_NAME: string;
  SOURCE_BRANCH_NAME: string;
  TARGET_BRANCH_NAME: string;
  PR_TITLE: string;
  PR_BODY: string;
  DRAFT: boolean;
  REQUIRE_MIDDLE_BRANCH: boolean;
  AUTO_MERGE: boolean;
  MERGE_METHOD: 'merge' | 'squash' | 'rebase';
  MAX_MERGE_RETRIES: number;
  MERGE_RETRY_INTERVAL: number;
  MILESTONE: number | undefined;
  ASSIGNEES: string[] | undefined;
  REVIEWERS: string[] | undefined;
  TEAM_REVIEWERS: string[] | undefined;
  LABELS: string[] | undefined;
  SIGNOFF: boolean;
}

export const prepareInputValues = (): IInputs => {
  return new Inputs(
    core.getInput('github_token', { required: true }),
    core.getInput('repo_owner', { required: true }),
    core.getInput('repo_name', { required: true }),
    core.getInput('remote_name', { required: false }) || 'origin',
    core.getInput('source_branch', { required: true }),
    core.getInput('target_branch', { required: true }),
    core.getInput('pr_title', { required: true }),
    core.getInput('pr_body', { required: false }),
    core.getInput('draft', { required: false }).toLowerCase() === 'true' ||
      false,
    core
      .getInput('require_middle_branch', { required: false })
      .toLowerCase() === 'true' || false,
    core.getInput('auto_merge', { required: false }).toLowerCase() === 'true' ||
      false,
    core.getInput('merge_method', { required: false }) || 'merge',
    core.getInput('max_merge_retries', { required: false }) || '60',
    core.getInput('merge_retry_interval', { required: false }) || '60',
    core.getInput('milestone', { required: false }),
    core.getInput('assignees', { required: false }).split(','),
    core.getInput('reviewers', { required: false }).split(','),
    core.getInput('team_reviewers', { required: false }).split(','),
    core.getInput('labels', { required: false }).split(','),
    core.getInput('signoff', { required: false }).toLowerCase() === 'true' ||
      false
  );
};

class Inputs implements IInputs {
  GITHUB_TOKEN: string;
  REPO_OWNER: string;
  REPO_NAME: string;
  REMOTE_NAME: string;
  SOURCE_BRANCH_NAME: string;
  TARGET_BRANCH_NAME: string;
  PR_TITLE: string;
  PR_BODY: string;
  DRAFT: boolean;
  REQUIRE_MIDDLE_BRANCH: boolean;
  AUTO_MERGE: boolean;
  MERGE_METHOD: 'merge' | 'squash' | 'rebase';
  MAX_MERGE_RETRIES: number;
  MERGE_RETRY_INTERVAL: number;
  MILESTONE: number | undefined;
  ASSIGNEES: string[] | undefined;
  REVIEWERS: string[] | undefined;
  TEAM_REVIEWERS: string[] | undefined;
  LABELS: string[] | undefined;
  SIGNOFF: boolean;

  constructor(
    githubToken: string,
    repoOwner: string,
    repoName: string,
    remoteName: string,
    sourceBranchName: string,
    targetBranchName: string,
    prTitle: string,
    prBody: string,
    draft: boolean,
    requireMiddleBranch: boolean,
    autoMerge: boolean,
    mergeMethod: string,
    maxMergeRetries: string,
    mergeRetryInterval: string,
    milestone: string,
    assignees: string[],
    reviewers: string[],
    teamReviewers: string[],
    labels: string[],
    signoff: boolean
  ) {
    this.GITHUB_TOKEN = githubToken;
    this.REPO_OWNER = repoOwner;
    this.REPO_NAME = repoName;
    this.REMOTE_NAME = remoteName;
    this.SOURCE_BRANCH_NAME = sourceBranchName;
    this.TARGET_BRANCH_NAME = targetBranchName;
    this.PR_TITLE = prTitle;
    this.PR_BODY = prBody;
    this.DRAFT = draft;
    this.REQUIRE_MIDDLE_BRANCH = requireMiddleBranch;
    this.AUTO_MERGE = autoMerge;
    this.MERGE_METHOD = ['merge', 'squash', 'rebase'].includes(mergeMethod)
      ? (mergeMethod as 'merge' | 'squash' | 'rebase')
      : 'merge';
    this.MAX_MERGE_RETRIES = parseInt(maxMergeRetries);
    this.MERGE_RETRY_INTERVAL = parseInt(mergeRetryInterval);
    this.MILESTONE = milestone !== '' ? parseInt(milestone) : undefined;
    this.ASSIGNEES =
      assignees.length === 1 && assignees[0] === '' ? undefined : assignees;
    this.REVIEWERS =
      reviewers.length === 1 && reviewers[0] === '' ? undefined : reviewers;
    this.TEAM_REVIEWERS =
      teamReviewers.length === 1 && teamReviewers[0] === ''
        ? undefined
        : teamReviewers;
    this.LABELS = labels.length === 1 && labels[0] === '' ? undefined : labels;
    this.SIGNOFF = signoff;
  }
}
