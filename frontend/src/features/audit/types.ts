export type AuditLogStatus = 'SUCCESS' | 'ERROR' | 'FORBIDDEN';
export type AuditHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface AuditLogEntry {
  publicId: string;
  user: { publicId: string; name: string; email: string } | null;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string | null;
  userAgent: string | null;
  action: string | null;
  resourceType: string | null;
  resourceId: string | null;
  status: AuditLogStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditFilters {
  url?: string;
  method?: AuditHttpMethod | '';
  status?: AuditLogStatus | '';
  statusCode?: string; // string para input livre, validado no apply
  action?: string;
  resourceType?: string;
  userId?: string; // publicId UUID
  ip?: string;
  startDate?: string; // ISO
  endDate?: string;   // ISO
}

export const EMPTY_FILTERS: AuditFilters = {
  url: '',
  method: '',
  status: '',
  statusCode: '',
  action: '',
  resourceType: '',
  userId: '',
  ip: '',
  startDate: '',
  endDate: '',
};

export const HTTP_METHODS: AuditHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const AUDIT_STATUSES: AuditLogStatus[] = ['SUCCESS', 'ERROR', 'FORBIDDEN'];
