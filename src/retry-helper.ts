import * as core from '@actions/core';
import { ErrorMessages } from './message';
import { createWorkflowUtils, IWorkflowUtils } from './workflow-utils';

const defaultMaxAttempts = 3;
const defaultMinSeconds = 10;
const defaultMaxSeconds = 20;

export async function executeWithDefaults<T>(
  action: (...vars: unknown[]) => Promise<T>
): Promise<T> {
  const retryHelper: RetryHelper = new RetryHelper(
    defaultMaxAttempts,
    defaultMinSeconds,
    defaultMaxSeconds,
    undefined
  );
  return await retryHelper.execute(action);
}

export async function executeWithCustomised<T>(
  maxAttempts: number,
  minSeconds: number | undefined,
  maxSecond: number | undefined,
  attemptsInterval: number | undefined,
  action: (...vars: unknown[]) => Promise<T>
): Promise<T> {
  const retryHelper: RetryHelper = new RetryHelper(
    maxAttempts,
    minSeconds,
    maxSecond,
    attemptsInterval
  );
  return await retryHelper.execute(action);
}

class RetryHelper {
  private readonly workflowUtils: IWorkflowUtils;
  private maxAttempts: number;
  private minSeconds: number | undefined;
  private maxSeconds: number | undefined;
  private attemptsInterval: number | undefined;

  constructor(
    maxAttempts: number,
    minSeconds: number | undefined,
    maxSeconds: number | undefined,
    attemptsInterval: number | undefined
  ) {
    this.workflowUtils = createWorkflowUtils();

    this.maxAttempts = maxAttempts;
    this.minSeconds =
      minSeconds === undefined ? undefined : Math.floor(minSeconds);
    this.maxSeconds =
      maxSeconds === undefined ? undefined : Math.floor(maxSeconds);
    this.attemptsInterval =
      attemptsInterval === undefined ? undefined : Math.floor(attemptsInterval);
    if (
      this.minSeconds &&
      this.maxSeconds &&
      this.minSeconds > this.maxSeconds
    ) {
      throw new Error(ErrorMessages.RETRY_HELPER_MIN_SECONDS_MAX_SECONDS_ERROR);
    }
  }

  async execute<T>(action: (...vars: unknown[]) => Promise<T>): Promise<T> {
    let attempt = 1;
    while (attempt < this.maxAttempts) {
      // Try
      try {
        return await action();
      } catch (err) {
        core.info(this.workflowUtils.getErrorMessage(err));
      }

      // Sleep
      const seconds: number =
        this.attemptsInterval !== undefined
          ? this.attemptsInterval
          : this.getSleepAmount();
      core.info(`Waiting ${seconds} seconds before trying again`);
      await this.sleep(seconds);
      attempt++;
    }

    // Last attempt
    return await action();
  }

  private getSleepAmount(): number {
    if (this.minSeconds === undefined || this.maxSeconds === undefined) {
      throw Error(
        "minSeconds and maxSeconds cannot be undefined when attemptsInterval isn't provided"
      );
    }
    return (
      Math.floor(Math.random() * (this.maxSeconds - this.minSeconds + 1)) +
      this.minSeconds
    );
  }

  private async sleep(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}
