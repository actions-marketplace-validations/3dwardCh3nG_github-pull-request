import * as core from '@actions/core';
import { IGitCommandManager } from './git-command-manager';
import { IGitSourceSettings } from './git-source-settings';
import { Constants } from './constants';
import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';
import { ErrorMessages } from './message';

export interface IGitAuthHelper {
  readonly git: IGitCommandManager;
  readonly settings: IGitSourceSettings;
  readonly tokenConfigKey: string;
  readonly tokenConfigValue: string;
  readonly gitConfigPath: string;
  readonly workingDirectory: string;
  configureAuth(): Promise<void>;
  removeAuth(): Promise<void>;
}

export class GitAuthHelper implements IGitAuthHelper {
  private readonly _git: IGitCommandManager;
  private readonly _settings: IGitSourceSettings;
  private _tokenConfigKey = '';
  private _tokenConfigValue = '';
  private _gitConfigPath = '';
  private _workingDirectory = '';

  constructor(git: IGitCommandManager, settings: IGitSourceSettings) {
    this._git = git;
    this._settings = settings;
    this._workingDirectory = this._git.getWorkingDirectory();
    const serverUrl: URL = this.getServerUrl(this._settings.githubServerUrl);
    this._tokenConfigKey = `http.${serverUrl.origin}/.extraheader`;
  }

  async configureAuth(): Promise<void> {
    await this.removeAuth();
    await this.configureToken();
  }

  async removeAuth(): Promise<void> {
    await this.removeToken();
  }

  private getServerUrl(url?: string): URL {
    const urlValue: string =
      url && url.trim().length > 0
        ? url
        : process.env['GITHUB_SERVER_URL'] ?? 'https://github.com';
    return new URL(urlValue);
  }

  private async removeToken(): Promise<void> {
    // HTTP extra header
    await this.removeGitConfig(this._tokenConfigKey);
  }

  private async configureToken(): Promise<void> {
    const basicCredential: string = Buffer.from(
      `x-access-token:${this._settings.authToken}`,
      'utf8'
    ).toString('base64');
    core.setSecret(basicCredential);
    this._tokenConfigValue = `AUTHORIZATION: basic ${basicCredential}`;

    if (this._gitConfigPath.length === 0) {
      const gitDir: string = await this.git.getGitDirectory();
      this._gitConfigPath = path.join(this._workingDirectory, gitDir, 'config');
    }

    // Configure a placeholder value. This approach avoids the credential being captured
    // by process creation audit events, which are commonly logged. For more information,
    // refer to https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/command-line-process-auditing
    await this._git.config(
      this._tokenConfigKey,
      Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE
    );

    // Replace the placeholder
    await this.replaceTokenPlaceholder();
  }

  private async removeGitConfig(configKey: string): Promise<void> {
    if (
      (await this._git.configExists(configKey)) &&
      !(await this._git.unsetConfig(configKey))
    ) {
      core.warning(`Failed to remove '${configKey}' from the git config`);
    }
    core.info(`Unset config key '${configKey}'`);
  }

  private async replaceTokenPlaceholder(): Promise<void> {
    let content: string = (
      await fs.promises.readFile(this._gitConfigPath)
    ).toString();
    const placeholderIndex: number = content.indexOf(
      Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE
    );
    if (
      placeholderIndex < 0 ||
      placeholderIndex !==
        content.lastIndexOf(Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE)
    ) {
      throw new Error(
        ErrorMessages.UNABLE_TO_REPLACE_AUTH_PLACEHOLDER + this._gitConfigPath
      );
    }
    assert.ok(
      this._tokenConfigValue,
      ErrorMessages.TOKEN_CONFIG_VALUE_IS_NOT_DEFINED
    );
    content = content.replace(
      Constants.TOKEN_PLACEHOLDER_CONFIG_VALUE,
      this._tokenConfigValue
    );
    await fs.promises.writeFile(this._gitConfigPath, content);
  }

  get git(): IGitCommandManager {
    return this._git;
  }

  get settings(): IGitSourceSettings {
    return this._settings;
  }

  get tokenConfigKey(): string {
    return this._tokenConfigKey;
  }

  get tokenConfigValue(): string {
    return this._tokenConfigValue;
  }

  get gitConfigPath(): string {
    return this._gitConfigPath;
  }

  set gitConfigPath(value: string) {
    this._gitConfigPath = value;
  }

  get workingDirectory(): string {
    return this._workingDirectory;
  }

  set workingDirectory(value: string) {
    this._workingDirectory = value;
  }
}
