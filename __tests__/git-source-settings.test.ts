import {
  GitSourceSettings,
  IGitSourceSettings
} from '../src/git-source-settings';

const repositoryPath: string = 'repositoryPath';
const repositoryOwner: string = 'repositoryOwner';
const repositoryName: string = 'repositoryName';
const authToken: string = 'authToken';
const githubServerUrl: string | undefined = 'githubServerUrl';

describe('Test git-source-settings.ts', (): void => {
  describe('Test constructor', (): void => {
    it('should create a new GitSourceSettings object', (): void => {
      const gitSourceSettings: IGitSourceSettings = new GitSourceSettings(
        repositoryPath,
        repositoryOwner,
        repositoryName,
        authToken,
        githubServerUrl
      );
      expect(gitSourceSettings).toBeDefined();
      expect(gitSourceSettings.repositoryPath).toEqual(repositoryPath);
      expect(gitSourceSettings.repositoryOwner).toEqual(repositoryOwner);
      expect(gitSourceSettings.repositoryName).toEqual(repositoryName);
      expect(gitSourceSettings.authToken).toEqual(authToken);
      expect(gitSourceSettings.githubServerUrl).toEqual(githubServerUrl);
    });

    it('should create a new GitSourceSettings object with undefined githubServerUrl', (): void => {
      const gitSourceSettings: IGitSourceSettings = new GitSourceSettings(
        repositoryPath,
        repositoryOwner,
        repositoryName,
        authToken,
        undefined
      );
      expect(gitSourceSettings).toBeDefined();
      expect(gitSourceSettings.repositoryPath).toEqual(repositoryPath);
      expect(gitSourceSettings.repositoryOwner).toEqual(repositoryOwner);
      expect(gitSourceSettings.repositoryName).toEqual(repositoryName);
      expect(gitSourceSettings.authToken).toEqual(authToken);
      expect(gitSourceSettings.githubServerUrl).not.toBeDefined();
    });
  });
});
