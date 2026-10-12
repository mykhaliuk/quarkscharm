import { reactive, ref } from 'vue';
import { QsError } from './qs/error';
import type { Preview } from './qs/map';
import type { RawRequest, RequestBody } from './qs/types';
import type { KeyedRun } from './selection-store';
import { toApiDate } from '~~/shared/utils/api-dates';

type Deps = {
  createRequest: (sequenceId: number, body: RequestBody) => Promise<RawRequest>;
  updateRequest: (requestId: number, body: RequestBody) => Promise<RawRequest>;
  workflowSequenceId: () => Promise<number>;
  employeeId: () => number;
  removeRun: (key: string) => void;
  afterChange: () => Promise<void>;
};

export type SubmitResult = { submitted: number; failed: number };

export const buildBody = (
  run: KeyedRun,
  preview: Preview,
  employeeId: number,
): RequestBody => {
  const duration = preview.segments.reduce((sum, s) => sum + s.duration, 0);
  const nature = preview.natures.find((n) => n.id === run.natureId);
  return {
    duration,
    beginDate: toApiDate(run.beginDate, run.beginHour),
    endDate: toApiDate(run.endDate, run.endHour),
    employeeId,
    segments: [
      {
        entitlementId: nature?.entitlementId ?? null,
        duration,
        natureId: run.natureId,
        id: null,
        beginDate: null,
        endDate: null,
        document: null,
      },
    ],
    comment: null,
  };
};

const messageOf = (error: unknown): string => {
  if (error instanceof QsError) {
    if (error.kind === 'unavailable')
      return 'quarksUp did not answer. Try again.';
    return error.messages.join(' ') || 'quarksUp rejected this run.';
  }
  return 'Submit failed.';
};

export const createSubmit = (deps: Deps) => {
  const errors = reactive(new Map<string, string>());
  const submitting = ref(false);
  let sequence: Promise<number> | null = null;

  const sequenceId = (): Promise<number> => {
    if (sequence === null) {
      sequence = deps.workflowSequenceId().catch((error) => {
        sequence = null;
        throw error;
      });
    }
    return sequence;
  };

  const submitOne = async (
    run: KeyedRun,
    preview: Preview,
    editing: number | null,
  ): Promise<boolean> => {
    const body = buildBody(run, preview, deps.employeeId());
    try {
      if (editing === null) await deps.createRequest(await sequenceId(), body);
      else await deps.updateRequest(editing, body);
      errors.delete(run.key);
      deps.removeRun(run.key);
      return true;
    } catch (error) {
      errors.set(run.key, messageOf(error));
      return false;
    }
  };

  const submitAll = async (
    runs: KeyedRun[],
    previews: Map<string, Preview>,
    editing: number | null,
  ): Promise<SubmitResult> => {
    submitting.value = true;
    try {
      const ready = runs.filter((run) => previews.has(run.key));
      const outcomes = await Promise.all(
        ready.map((run) =>
          submitOne(run, previews.get(run.key) as Preview, editing),
        ),
      );
      const submitted = outcomes.filter(Boolean).length;
      if (submitted > 0) await deps.afterChange();
      return { submitted, failed: outcomes.length - submitted };
    } finally {
      submitting.value = false;
    }
  };

  const clearErrors = () => errors.clear();

  return { errors, submitting, submitAll, clearErrors };
};

export type SubmitStore = ReturnType<typeof createSubmit>;
