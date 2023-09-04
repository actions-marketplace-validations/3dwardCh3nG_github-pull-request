import * as core from '@actions/core';
import { ErrorMessages } from './message';

const defaultMaxAttempts: number = 3;
const defaultMinSeconds: number = 10;
const defaultMaxSeconds: number = 20;

export interface IRetryHelper {}

export async function executeWithDefaults<T>(
  action: () => Promise<T>,
): Promise<T> {
  const retryHelper: RetryHelper = new RetryHelper(
    defaultMaxAttempts,
    defaultMinSeconds,
    defaultMaxSeconds,
  );
  return await retryHelper.execute(action);
}

export async function executeWithCustomised<T>(
  maxAttempts: number,
  minSeconds: number,
  maxSecond: number,
  action: () => Promise<T>,
): Promise<T> {
  const retryHelper: RetryHelper = new RetryHelper(
    maxAttempts,
    minSeconds,
    maxSecond,
  );
  return await retryHelper.execute(action);
}

class RetryHelper {
  private maxAttempts: number;
  private minSeconds: number;
  private maxSeconds: number;

  constructor(maxAttempts: number, minSeconds: number, maxSeconds: number) {
    this.maxAttempts = maxAttempts;
    this.minSeconds = Math.floor(minSeconds);
    this.maxSeconds = Math.floor(maxSeconds);
    if (this.minSeconds > this.maxSeconds) {
      throw new Error(ErrorMessages.RETRY_HELPER_MIN_SECONDS_MAX_SECONDS_ERROR);
    }
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    let attempt = 1;
    while (attempt < this.maxAttempts) {
      // Try
      try {
        return await action();
      } catch (err) {
        core.info((err as any)?.message);
      }

      // Sleep
      const seconds = this.getSleepAmount();
      core.info(`Waiting ${seconds} seconds before trying again`);
      await this.sleep(seconds);
      attempt++;
    }

    // Last attempt
    return await action();
  }

  private getSleepAmount(): number {
    return (
      Math.floor(Math.random() * (this.maxSeconds - this.minSeconds + 1)) +
      this.minSeconds
    );
  }

  private async sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}
