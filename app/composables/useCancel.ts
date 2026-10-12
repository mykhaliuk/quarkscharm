import { cancelRequest } from '~/utils/qs/api';
import { QsError } from '~/utils/qs/error';
import type { AbsenceRequest } from '~/utils/qs/map';
import { whenConnected } from '~/utils/qs/retry';

export const useCancel = () => {
  const { store: yearStore } = useYear();
  const cancel = async (request: AbsenceRequest): Promise<string | null> => {
    if (request.cancelSequenceId === null) return null;
    try {
      await whenConnected(() =>
        cancelRequest(request.id, request.cancelSequenceId as number),
      );
    } catch (error) {
      if (!(error instanceof QsError)) throw error;
      return messageOf(error);
    }
    await Promise.all([yearStore.reload(), ...afterChangeHooks()]);
    return null;
  };
  return { cancel };
};

function messageOf(error: QsError): string {
  if (error.kind === 'unavailable')
    return 'quarksUp did not answer. Try again.';
  return error.messages.join(' ') || 'quarksUp refused the cancel.';
}
