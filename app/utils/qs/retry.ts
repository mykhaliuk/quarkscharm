import { QsError } from './error';
import { getQsHooks } from './fetch';

export const whenConnected = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (!(error instanceof QsError) || error.kind !== 'expired') throw error;
    await getQsHooks().whenConnected();
    return fn();
  }
};
