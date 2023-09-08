export interface IGitSourceSettings {
  readonly repositoryPath: string;
  readonly repositoryOwner: string;
  readonly repositoryName: string;
  readonly authToken: string;
  readonly githubServerUrl: string | undefined;
}

export class GitSourceSettings implements IGitSourceSettings {
  private readonly _repositoryPath: string;
  private readonly _repositoryOwner: string;
  private readonly _repositoryName: string;
  private readonly _authToken: string;
  private readonly _githubServerUrl: string | undefined;

  constructor(
    repositoryPath: string,
    repositoryOwner: string,
    repositoryName: string,
    authToken: string,
    githubServerUrl: string | undefined
  ) {
    this._repositoryPath = repositoryPath;
    this._repositoryOwner = repositoryOwner;
    this._repositoryName = repositoryName;
    this._authToken = authToken;
    this._githubServerUrl = githubServerUrl;
  }

  get repositoryPath(): string {
    return this._repositoryPath;
  }

  get repositoryOwner(): string {
    return this._repositoryOwner;
  }

  get repositoryName(): string {
    return this._repositoryName;
  }

  get authToken(): string {
    return this._authToken;
  }

  get githubServerUrl(): string | undefined {
    return this._githubServerUrl;
  }
}
