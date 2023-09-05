export interface IGitSourceSettings {
  getRepositoryPath(): string;

  getRepositoryOwner(): string;

  getRepositoryName(): string;

  getAuthToken(): string;

  getGithubServerUrl(): string | undefined;
}

export function createSourceSettings(
  repositoryPath: string,
  repositoryOwner: string,
  repositoryName: string,
  authToken: string,
  githubServerUrl: string | undefined
): IGitSourceSettings {
  return new GitSourceSettings(
    repositoryPath,
    repositoryOwner,
    repositoryName,
    authToken,
    githubServerUrl
  );
}

class GitSourceSettings implements IGitSourceSettings {
  private readonly repositoryPath: string;
  private readonly repositoryOwner: string;
  private readonly repositoryName: string;
  private readonly authToken: string;
  private readonly githubServerUrl: string | undefined;

  constructor(
    repositoryPath: string,
    repositoryOwner: string,
    repositoryName: string,
    authToken: string,
    githubServerUrl: string | undefined
  ) {
    this.repositoryPath = repositoryPath;
    this.repositoryOwner = repositoryOwner;
    this.repositoryName = repositoryName;
    this.authToken = authToken;
    this.githubServerUrl = githubServerUrl;
  }

  getRepositoryPath(): string {
    return this.repositoryPath;
  }

  getRepositoryOwner(): string {
    return this.repositoryOwner;
  }

  getRepositoryName(): string {
    return this.repositoryName;
  }

  getAuthToken(): string {
    return this.authToken;
  }

  getGithubServerUrl(): string | undefined {
    return this.githubServerUrl;
  }
}
