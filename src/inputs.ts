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
  MILESTONE: number | undefined;
  ASSIGNEES: string[] | undefined;
  REVIEWERS: string[] | undefined;
  REAM_REVIEWERS: string[] | undefined;
  LABELS: string[] | undefined;
  SIGNOFF: boolean | undefined;
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
    core.getInput('milestone', { required: false }),
    core.getInput('assignees', { required: false }).split(','),
    core.getInput('reviewers', { required: false }).split(','),
    core.getInput('team_reviewers', { required: false }).split(','),
    core.getInput('labels', { required: false }).split(','),
    core.getInput('signoff', { required: false }).toLowerCase() === 'true' ||
      false,
  );
};

class Inputs implements IInputs {
  public GITHUB_TOKEN: string;
  public REPO_OWNER: string;
  public REPO_NAME: string;
  public REMOTE_NAME: string;
  public SOURCE_BRANCH_NAME: string;
  public TARGET_BRANCH_NAME: string;
  public PR_TITLE: string;
  public PR_BODY: string;
  public DRAFT: boolean;
  public REQUIRE_MIDDLE_BRANCH: boolean;
  public AUTO_MERGE: boolean;
  public MILESTONE: number | undefined;
  public ASSIGNEES: string[] | undefined;
  public REVIEWERS: string[] | undefined;
  public REAM_REVIEWERS: string[] | undefined;
  public LABELS: string[] | undefined;
  public SIGNOFF: boolean | undefined;

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
    milestone: string,
    assignees: string[],
    reviewers: string[],
    teamReviewers: string[],
    labels: string[],
    signoff: boolean,
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
    this.MILESTONE = milestone !== '' ? parseInt(milestone) : undefined;
    this.ASSIGNEES =
      assignees.length === 1 && assignees[0] === '' ? assignees : undefined;
    this.REVIEWERS =
      reviewers.length === 1 && reviewers[0] === '' ? reviewers : undefined;
    this.REAM_REVIEWERS =
      teamReviewers.length === 1 && teamReviewers[0] === ''
        ? teamReviewers
        : undefined;
    this.LABELS = labels.length === 1 && labels[0] === '' ? labels : undefined;
    this.SIGNOFF = signoff;
  }
}
