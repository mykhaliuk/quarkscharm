import { createRequest, getWorkflowsMe, updateRequest } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { createSubmit, type SubmitStore } from '~/utils/submit-store';

let store: SubmitStore | null = null;
const afterChangeHooksList: (() => Promise<void>)[] = [];

export const onAfterChange = (hook: () => Promise<void>) => {
  afterChangeHooksList.push(hook);
};

export const afterChangeHooks = (): Promise<void>[] =>
  afterChangeHooksList.map((hook) => hook());

export const useSubmit = (): SubmitStore => {
  if (store !== null) return store;
  const session = useSession();
  const selection = useSelection();
  const { store: yearStore } = useYear();
  store = createSubmit({
    createRequest: (sequenceId, body) =>
      whenConnected(() => createRequest(sequenceId, body)),
    updateRequest: (requestId, body) =>
      whenConnected(() => updateRequest(requestId, body)),
    workflowSequenceId: async () => {
      const workflows = await whenConnected(getWorkflowsMe);
      const sequenceId = workflows.TakeLeave?.sequenceId;
      if (sequenceId === undefined) throw new Error('no TakeLeave workflow');
      return sequenceId;
    },
    employeeId: () => session.state.me?.employeeId ?? 0,
    removeRun: (key) => {
      const run = selection.runs.value.find(
        (candidate) => candidate.key === key,
      );
      if (run) selection.removeRun(run);
    },
    afterChange: async () => {
      selection.forget();
      await Promise.all([yearStore.reload(), ...afterChangeHooks()]);
    },
  });
  return store;
};
