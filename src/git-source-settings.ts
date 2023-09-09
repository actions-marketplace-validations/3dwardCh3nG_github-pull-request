export interface IGitSourceSettings {
  readonly repositoryPath: string;
  readonly repositoryOwner: string;
  readonly repositoryName: string;
  readonly authToken: string;
  readonly githubServerUrl: string | undefined;
  readonly workflowOrganizationId: string | undefined;
  readonly sshKey: string | undefined;
  readonly sshKnownHosts: string | undefined;
  readonly sshStrict: boolean | undefined;
  readonly persistCredentials: boolean | undefined;
}

export class GitSourceSettings implements IGitSourceSettings {
  private readonly _repositoryPath: string;
  private readonly _repositoryOwner: string;
  private readonly _repositoryName: string;
  private readonly _authToken: string;
  private readonly _githubServerUrl: string | undefined;
  private readonly _workflowOrganizationId: string | undefined;
  private readonly _sshKey: string | undefined;
  private readonly _sshKnownHosts: string | undefined;
  private readonly _sshStrict: boolean | undefined;
  private readonly _persistCredentials: boolean | undefined;

  constructor(
    repositoryPath: string,
    repositoryOwner: string,
    repositoryName: string,
    authToken: string,
    githubServerUrl: string | undefined,
    workflowOrganizationId: string | undefined,
    sshKey: string | undefined,
    sshKnownHosts: string | undefined,
    sshStrict: boolean | undefined,
    persistCredentials: boolean | undefined
  ) {
    this._repositoryPath = repositoryPath;
    this._repositoryOwner = repositoryOwner;
    this._repositoryName = repositoryName;
    this._authToken = authToken;
    this._githubServerUrl = githubServerUrl;
    this._workflowOrganizationId = workflowOrganizationId;
    this._sshKey = sshKey;
    this._sshKnownHosts = sshKnownHosts;
    this._sshStrict = sshStrict;
    this._persistCredentials = persistCredentials;
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

  get workflowOrganizationId(): string | undefined {
    return this._workflowOrganizationId;
  }

  get sshKey(): string | undefined {
    return this._sshKey;
  }

  get sshKnownHosts(): string | undefined {
    return this._sshKnownHosts;
  }

  get sshStrict(): boolean | undefined {
    return this._sshStrict;
  }

  get persistCredentials(): boolean | undefined {
    return this._persistCredentials;
  }
}
