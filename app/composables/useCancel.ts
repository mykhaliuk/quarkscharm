import { cancelRequest } from '~/utils/qs/api';
import type { AbsenceRequest } from '~/utils/qs/map';
import { whenConnected } from '~/utils/qs/retry';

export const useCancel = () => {
  const { store: yearStore } = useYear();
  const cancel = async (request: AbsenceRequest): Promise<void> => {
    if (request.cancelSequenceId === null) return;
    await whenConnected(() =>
      cancelRequest(request.id, request.cancelSequenceId as number),
    );
    await Promise.all([yearStore.reload(), ...afterChangeHooks()]);
  };
  return { cancel };
};
