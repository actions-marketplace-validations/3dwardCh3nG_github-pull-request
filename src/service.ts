import { IInputs, prepareInputValues } from './inputs';
import { ErrorMessages, InfoMessages, WarningMessages } from './message';
import * as core from '@actions/core';
import { createWorkflowUtils, IWorkflowUtils } from './workflow-utils';
import {
  createGitCommandManager,
  IGitCommandManager,
  IRemoteDetail,
  IWorkingBaseAndType,
  WorkingBaseType,
} from './git-command-manager';
import { createAuthHelper, IGitAuthHelper } from './git-auth-helper';
import {
  createSourceSettings,
  IGitSourceSettings,
} from './git-source-settings';
import { createGithubClient, IGithubClient, Pull } from './github-client';
import { v4 as uuidv4 } from 'uuid';

export interface ICreateOrUpdatePullRequestBranchResult {
  action: string;
  sourceBranch: string;
  targetBranch: string;
  hasDiffWithTargetBranch: boolean;
  headSha: string;
}

export interface IService {
  createPullRequest(): Promise<void>;
}

export function createService(): IService {
  return new Service();
}

class Service implements IService {
  private readonly inputs: IInputs;
  private readonly workflowUtils: IWorkflowUtils;

  constructor() {
    this.inputs = prepareInputValues();
    this.workflowUtils = createWorkflowUtils();
  }

  async createPullRequest(): Promise<void> {
    this.inputDataChecks();
    const repoPath = this.workflowUtils.getRepoPath();
    const git: IGitCommandManager = await createGitCommandManager(repoPath);
    const gitSourceSettings: IGitSourceSettings = createSourceSettings(
      repoPath,
      this.inputs.REPO_OWNER,
      this.inputs.REPO_NAME,
      this.inputs.SOURCE_BRANCH_NAME,
      this.inputs.TARGET_BRANCH_NAME,
    );
    let gitAuthHelper: IGitAuthHelper = createAuthHelper(
      git,
      gitSourceSettings,
    );
    const remoteUrl: string = await git.getRepoRemoteUrl();
    const remoteDetail: IRemoteDetail = git.getRemoteDetail(remoteUrl);
    core.info(InfoMessages.PR_TARGET_REPO + remoteDetail.repository);

    if ('HTTPS' === remoteDetail.protocol) {
      core.info(InfoMessages.CONFIG_AUTH_HTTPS);
      await gitAuthHelper.configureAuth();
    }

    try {
      core.startGroup('Create or update the pull request branch');
      const result: ICreateOrUpdatePullRequestBranchResult =
        await this.preparePullRequestBranch(git);
      core.endGroup();

      await this.pushPullRequestBranch(git, result);

      if (result.hasDiffWithTargetBranch) {
        core.startGroup('Create or update the pull request');
        const githubClient: IGithubClient = createGithubClient(
          this.inputs.GITHUB_TOKEN,
        );
        const pull: Pull = await githubClient.preparePullRequest(
          this.inputs,
          result,
        );
        core.endGroup();

        core.startGroup('Setting outputs');
        core.setOutput('pull-request-number', pull.number);
        core.setOutput('pull-request-url', pull.html_url);
        if (pull.created) {
          core.setOutput('pull-request-operation', 'created');
        } else if (result.action == 'updated') {
          core.setOutput('pull-request-operation', 'updated');
        }
        core.setOutput('pull-request-head-sha', result.headSha);
        core.endGroup();
      }
    } catch (error) {
      core.setFailed(this.workflowUtils.getErrorMessage(error));
    } finally {
      await gitAuthHelper.removeAuth();
    }
  }

  private async preparePullRequestBranch(
    git: IGitCommandManager,
  ): Promise<ICreateOrUpdatePullRequestBranchResult> {
    const result: ICreateOrUpdatePullRequestBranchResult = {
      action: 'none',
      sourceBranch: this.inputs.SOURCE_BRANCH_NAME,
      targetBranch: this.inputs.TARGET_BRANCH_NAME,
      hasDiffWithTargetBranch: false,
      headSha: '',
    };

    let workingBaseAndType: IWorkingBaseAndType;
    workingBaseAndType = await git.getWorkingBaseAndType();
    if (
      workingBaseAndType.workingBaseType == WorkingBaseType.Commit &&
      !this.inputs.TARGET_BRANCH_NAME
    ) {
      throw new Error(
        ErrorMessages.TARGET_BRANCH_IS_NOT_SUPPLIED_WHEN_IN_DETACHED_HEAD_STATUS,
      );
    }

    const stashed = await git.stashPush(['--include-untracked']);

    if (workingBaseAndType.workingBase != this.inputs.TARGET_BRANCH_NAME) {
      await git.fetchRemote(
        [`${this.inputs.TARGET_BRANCH_NAME}:${this.inputs.TARGET_BRANCH_NAME}`],
        this.inputs.REMOTE_NAME,
        ['--force'],
      );
      await git.checkout(this.inputs.TARGET_BRANCH_NAME);
      await git.pull();
    }
    const tempBranch = uuidv4();
    await git.checkout(tempBranch, 'HEAD');

    let pullRequestBranchName: string = this.inputs.SOURCE_BRANCH_NAME;
    if (this.inputs.REQUIRE_MIDDLE_BRANCH) {
      pullRequestBranchName = `${this.inputs.SOURCE_BRANCH_NAME}-merge-to-${this.inputs.TARGET_BRANCH_NAME}`;
      result.targetBranch = pullRequestBranchName;
    }

    if (!(await git.fetch(this.inputs.REMOTE_NAME, pullRequestBranchName))) {
      core.info(
        `Pull request branch '${pullRequestBranchName}' does not exist yet.`,
      );
      await git.checkout(pullRequestBranchName, tempBranch);
      result.hasDiffWithTargetBranch = await git.isAhead(
        this.inputs.TARGET_BRANCH_NAME,
        pullRequestBranchName,
      );
      if (result.hasDiffWithTargetBranch) {
        result.action = 'created';
        core.info(`Created branch '${pullRequestBranchName}'`);
      } else {
        core.info(
          `Branch '${pullRequestBranchName}' is not ahead of base '${this.inputs.TARGET_BRANCH_NAME}' and will not be created`,
        );
      }
    } else {
      core.info(
        `Pull request branch '${pullRequestBranchName}' already exists as remote branch '${this.inputs.REMOTE_NAME}/${pullRequestBranchName}'`,
      );
      await git.checkout(pullRequestBranchName);
      const tempBranchCommitsAhead: number = await git.commitsAhead(
        this.inputs.TARGET_BRANCH_NAME,
        tempBranch,
      );
      const branchCommitsAhead: number = await git.commitsAhead(
        this.inputs.TARGET_BRANCH_NAME,
        pullRequestBranchName,
      );
      if (
        (await git.hasDiff([`${pullRequestBranchName}..${tempBranch}`])) ||
        branchCommitsAhead != tempBranchCommitsAhead ||
        !(tempBranchCommitsAhead > 0)
      ) {
        core.info(`Resetting '${pullRequestBranchName}'`);
        await git.checkout(pullRequestBranchName, tempBranch);
      }
      if (
        !(await git.isEven(
          `${this.inputs.REMOTE_NAME}/${pullRequestBranchName}`,
          pullRequestBranchName,
        ))
      ) {
        result.action = 'updated';
        core.info(`Updated branch '${pullRequestBranchName}'`);
      } else {
        result.action = 'not-updated';
        core.info(
          `Branch '${pullRequestBranchName}' is even with its remote and will not be updated`,
        );
      }
      result.hasDiffWithTargetBranch = await git.isAhead(
        this.inputs.TARGET_BRANCH_NAME,
        pullRequestBranchName,
      );
    }
    result.headSha = await git.revParse('HEAD');
    await git.deleteBranch(tempBranch, ['--force']);

    await git.checkout(workingBaseAndType.workingBase);

    if (stashed) {
      await git.stashPop();
    }

    return result;
  }

  private async pushPullRequestBranch(
    git: IGitCommandManager,
    result: ICreateOrUpdatePullRequestBranchResult,
  ): Promise<void> {
    if (['created', 'updated'].includes(result.action)) {
      core.startGroup(
        `Pushing pull request branch to '${this.inputs.REMOTE_NAME}/${result.sourceBranch}'`,
      );
      await git.push([
        '--force-with-lease',
        this.inputs.REMOTE_NAME,
        `${result.sourceBranch}:refs/heads/${result.sourceBranch}`,
      ]);
      core.endGroup();
    }
  }

  private inputDataChecks(): void {
    this.checkGithubToken();
    this.checkBodySize();
    this.checkBranchNames();
  }

  private checkGithubToken(): void {
    if (!this.inputs.GITHUB_TOKEN) {
      throw new Error(ErrorMessages.INPUT_GITHUB_TOKEN_NOT_SUPPLIED);
    }
  }

  private checkBodySize(): void {
    if (this.inputs.PR_BODY.length > 65536) {
      core.warning(WarningMessages.PR_BODY_TOO_LONG);
      this.inputs.PR_BODY = this.inputs.PR_BODY.substring(0, 65536);
    }
  }

  private checkBranchNames(): void {
    if (this.inputs.SOURCE_BRANCH_NAME == this.inputs.TARGET_BRANCH_NAME) {
      throw new Error(ErrorMessages.BRANCH_NAME_SAME_ERROR);
    }
  }
}
