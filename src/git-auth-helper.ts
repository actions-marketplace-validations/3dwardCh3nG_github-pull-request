import * as core from '@actions/core';
import { IGitCommandManager } from './git-command-manager';
import { IGitSourceSettings } from './git-source-settings';
import { Constants } from './constants';
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';
import { ErrorMessages } from './message';

export interface IGitAuthHelper {
  configureAuth(): Promise<void>;

  removeAuth(): Promise<void>;
}

export function createAuthHelper(
  git: IGitCommandManager,
  settings?: IGitSourceSettings
): IGitAuthHelper {
  return new GitAuthHelper(git, settings);
}

class GitAuthHelper implements IGitAuthHelper {
  private readonly git: IGitCommandManager;
  private readonly settings: IGitSourceSettings;
  private tokenConfigKey = '';
  private tokenConfigValue = '';

  constructor(git: IGitCommandManager, settings?: IGitSourceSettings) {
    this.git = git;
    this.settings = settings || ({} as IGitSourceSettings);
    this.init();
  }

  async configureAuth(): Promise<void> {
    await this.removeAuth();
    await this.configureToken();
  }

  async removeAuth(): Promise<void> {
    await this.removeToken();
  }

  private init(): void {
    const serverUrl: URL = this.getServerUrl(
      this.settings.getGithubServerUrl()
    );
    this.tokenConfigKey = `http.${serverUrl.origin}/.extraheader`;
    const basicCredential: string = Buffer.from(
      `x-access-token:${this.settings.getAuthToken()}`,
      'utf8'
    ).toString('base64');
    core.setSecret(basicCredential);
    this.tokenConfigValue = `AUTHORIZATION: basic ${basicCredential}`;
  }

  private getServerUrl(url?: string): URL {
    const urlValue: string =
      url && url.trim().length > 0
        ? url
        : process.env['GITHUB_SERVER_URL'] || 'https://github.com';
    return new URL(urlValue);
  }

  private async removeToken(): Promise<void> {
    // HTTP extra header
    await this.removeGitConfig(this.tokenConfigKey);
  }

  private async configureToken(
    configPath?: string,
    globalConfig?: boolean
  ): Promise<void> {
    assert.ok(
      (configPath && globalConfig) || (!configPath && !globalConfig),
      'Unexpected configureToken parameter combinations'
    );

    if (!configPath && !globalConfig) {
      configPath = path.join(this.git.getWorkingDirectory(), '.git', 'config');
    }

    // Configure a placeholder value. This approach avoids the credential being captured
    // by process creation audit events, which are commonly logged. For more information,
    // refer to https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/command-line-process-auditing
    await this.git.config(
      this.tokenConfigKey,
      Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE,
      globalConfig
    );

    // Replace the placeholder
    await this.replaceTokenPlaceholder(configPath || '');
  }

  private async removeGitConfig(configKey: string): Promise<void> {
    if (
      (await this.git.configExists(configKey)) &&
      !(await this.git.unsetConfig(configKey))
    ) {
      core.warning(`Failed to remove '${configKey}' from the git config`);
    }
  }

  private async replaceTokenPlaceholder(configPath: string): Promise<void> {
    assert.ok(configPath, ErrorMessages.CONFIG_PATH_IS_NOT_DEFINED);
    let content: string = (await fs.promises.readFile(configPath)).toString();
    const placeholderIndex = content.indexOf(
      Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE
    );
    if (
      placeholderIndex < 0 ||
      placeholderIndex !==
        content.lastIndexOf(Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE)
    ) {
      throw new Error(
        ErrorMessages.UNABLE_TO_REPLACE_AUTH_PLACEHOLDER + configPath
      );
    }
    assert.ok(
      this.tokenConfigValue,
      ErrorMessages.TOKEN_CONFIG_VALUE_IS_NOT_DEFINED
    );
    content = content.replace(
      Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE,
      this.tokenConfigValue
    );
    await fs.promises.writeFile(configPath, content);
  }
}
