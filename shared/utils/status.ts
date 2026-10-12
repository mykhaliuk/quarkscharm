export const STATUS = {
  new: 1,
  validated: 2,
  refused: 3,
  cancelled: 4,
  cancelOngoingManager: 5,
  cancelOngoingRh: 6,
} as const;

export type StatusId = (typeof STATUS)[keyof typeof STATUS];

const DRAWN: readonly number[] = [
  STATUS.new,
  STATUS.validated,
  STATUS.cancelOngoingManager,
  STATUS.cancelOngoingRh,
];

const PENDING: readonly number[] = [
  STATUS.new,
  STATUS.cancelOngoingManager,
  STATUS.cancelOngoingRh,
];

export const isDrawn = (statusId: number): boolean => DRAWN.includes(statusId);

export const isPending = (statusId: number): boolean =>
  PENDING.includes(statusId);

export const VISIBLE_STATUS_IDS: readonly number[] = DRAWN;
