export type RawPicture = {
  url?: string | null;
  thumbnails?: { small?: string; medium?: string; large?: string } | null;
} | null;

export type RawEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  reference?: string;
  picture?: RawPicture;
  job?: { id?: number; label?: string } | null;
  entity?: { id?: number; label?: string } | null;
  position?: {
    serviceId?: number;
    job?: { label?: string } | null;
    entity?: { label?: string } | null;
  } | null;
};

export type RawMe = {
  login?: string;
  employee: { id: number; firstName: string; lastName: string };
  role?: { type?: string };
  timeZone?: string;
  locale?: string;
  picture?: RawPicture;
};

export type RawNature = {
  id: number;
  reference: string;
  label: string;
  paidLeave?: boolean;
  entitlementAccruable?: boolean;
  timeSavingAccount?: boolean;
  isActive?: boolean;
  color?: number | string | null;
  plannerCode?: string;
};

export type RawPeriod = {
  id: number;
  natureId: number;
  reference?: string;
  label?: string;
  isActive?: boolean;
  dateBegin?: string | null;
  dateEnd?: string | null;
};

export type RawDirectoryPerson = {
  id: number;
  firstName?: string;
  lastName?: string;
  pinned?: boolean;
};

export type RawStatus = { id: number; reference?: string; label: string };

export type RawItemSet<T> = { reference?: string; label?: string; items: T[] };

export type RawEntitlement = {
  id: number;
  earned: number;
  used: number;
  balance: number;
  pending?: number;
  saved?: number;
  period: {
    id: number;
    natureId: number;
    beginDate?: string;
    endDate?: string;
    agreement?: { id?: number; label?: string } | null;
  };
  employee?: RawEmployee;
};

export type RawSegment = {
  id?: number;
  beginDate: string;
  endDate: string;
  duration: number;
  natureId?: number | null;
  periodId?: number | null;
  validated?: boolean;
};

export type RawWorkflow = {
  label?: string;
  href?: string;
  sequenceId: number;
  nextStatus?: string;
  fields?: unknown[];
};

export type RawRequest = {
  id: number;
  statusId: number;
  date?: string;
  beginDate: string;
  endDate: string;
  duration: number;
  comment?: string | null;
  _isReadOnly?: boolean;
  employee?: RawEmployee;
  segments: RawSegment[];
  _workflows?: Record<string, RawWorkflow> | null;
};

export type RawRequestsPage = { '@odata.count'?: number; value: RawRequest[] };

export type RawPlannerAbsence = { id: number; segments: RawSegment[] };

export type RawPlannerEmployee = RawEmployee & {
  duration?: number;
  nonWorkingDates?: string[];
  absences?: RawPlannerAbsence[];
  engagements?: unknown[];
};

export type RawPlannerService = {
  id: number;
  label?: string | null;
  employees: RawPlannerEmployee[];
};

export type RawHolidays = {
  public?: { label: string; date: string }[];
  schoolTerm?: {
    area?: string;
    holidays?: { beginDate: string; endDate: string; label: string }[];
  }[];
};

export type RawWorkflowsMe = Record<string, RawWorkflow>;

export type RawPreviewNature = {
  id: number;
  reference?: string;
  label?: string;
  threshold?: number | null;
  entitlement?: {
    id: number;
    periodId?: number;
    balance?: number;
    earned?: number;
    used?: number;
    pending?: number;
  } | null;
  enforceWholeDayAbsence?: boolean;
  enforceEntitlementThreshold?: boolean;
  requiresDocument?: boolean;
};

export type RawPreviewSegment = {
  beginDate: string;
  endDate: string;
  duration: number;
  expectedDuration?: number;
  natureId: number | null;
};

export type RawOverlap = {
  employee: RawEmployee;
  beginDate: string;
  endDate: string;
  statusId?: number;
};

export type RawPreview = {
  calendarType?: string;
  natures?: RawPreviewNature[];
  segments?: RawPreviewSegment[];
  overlappingRequests?: RawOverlap[];
  conflictingEvents?: unknown[];
  warnings?: unknown[];
};

export type RequestSegmentBody = {
  entitlementId: number | null;
  duration: number;
  natureId: number;
  id: number | null;
  beginDate: string | null;
  endDate: string | null;
  document: null;
};

export type RequestBody = {
  duration: number;
  beginDate: string;
  endDate: string;
  employeeId: number;
  segments: RequestSegmentBody[];
  comment: string | null;
};

export type RawCreateEnvelope = {
  result: { identifier?: number; request?: unknown; result: RawRequest }[];
};

export type RawCancelAnswer = { type?: string };
