export type QsErrorKind = 'expired' | 'rejected' | 'unavailable';

export class QsError extends Error {
  kind: QsErrorKind;
  status: number | null;
  messages: string[];

  constructor(
    kind: QsErrorKind,
    status: number | null = null,
    messages: string[] = [],
  ) {
    super(messages[0] ?? kind);
    this.name = 'QsError';
    this.kind = kind;
    this.status = status;
    this.messages = messages;
  }
}
