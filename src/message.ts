export const InfoMessages = {
  INITIALISING_GIT_COMMAND_MANAGER: 'Initialising Git Command Manager...',
  PR_CREATED: 'Pull Request created successfully.',
  CONFIG_AUTH_HTTPS: 'Configuring credential for HTTPS authentication',
  PR_TARGET_REPO: 'Pull request branch target repository set to ',
};
export const WarningMessages = {
  PR_BODY_TOO_LONG:
    'The maximum size of the Pull Request body 65536 character. Your input PR body message will be truncated shorter.',
};

export const ErrorMessages = {
  GITHUB_WORKSPACE_NOT_DEFINED: 'GITHUB_WORKSPACE not defined',
  UNABLE_TO_REPLACE_AUTH_PLACEHOLDER: 'Unable to replace auth placeholder in ',
  CONFIG_PATH_IS_NOT_DEFINED: 'configPath is not defined',
  TOKEN_CONFIG_VALUE_IS_NOT_DEFINED: 'tokenConfigValue is not defined',
  INPUT_GITHUB_TOKEN_NOT_SUPPLIED:
    'Input Github Token not supplied. Unable to continue.',
  URL_MATCHER_FAILED: 'Could not parse GitHub Server name',
  RETRY_HELPER_MIN_SECONDS_MAX_SECONDS_ERROR:
    'The minSeconds should be less than or equal to the maxSeconds',
  BRANCH_NAME_SAME_ERROR:
    'The source_branch and the target_branch for a pull request must be different branches. Unable to continue.',
  TARGET_BRANCH_IS_NOT_SUPPLIED_WHEN_IN_DETACHED_HEAD_STATUS:
    'When in the detached HEAD state, the target_branch input must be supplied.',
  TARGET_BRANCH_IS_NOT_SUPPLIED:
    'When the repository is checked out on a commit instead of a branch, the target_branch input must be supplied.',
};
