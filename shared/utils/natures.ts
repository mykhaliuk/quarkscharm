export const DEFAULT_BRUSHES = ['TT', 'FOFF', 'CP'] as const;

const COLOR_TOKENS: Record<string, string> = {
  TT: '--nature-tt',
  FOFF: '--nature-foff',
  CP: '--nature-cp',
  CETCP: '--nature-cetcp',
  CETFOFF: '--nature-cetfoff',
  RTT: '--nature-rtt',
};

export const natureColorToken = (reference: string | null): string =>
  (reference !== null && COLOR_TOKENS[reference]) || '--nature-other';
