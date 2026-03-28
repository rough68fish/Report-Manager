export type ReportType = 'bi_dashboard' | 'pdf_report' | 'web_report' | 'sql_extract';
export type ReportStatus = 'draft' | 'published' | 'archived';
export type CategoryType = 'department' | 'topic' | 'data_domain' | 'audience';

export interface DataField {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  dataType: string | null;
  sourceSystem: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType | null;
  parentId: string | null;
  children?: Category[];
}

export interface ReportTag {
  id: string;
  tag: string;
}

export interface Report {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: ReportType;
  url: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  department: string | null;
  refreshCadence: string | null;
  dataStartDate: string | null;
  dataEndDate: string | null;
  status: ReportStatus;
  drupalNodeId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  dataFields: Array<{ dataField: DataField }>;
  categories: Array<{ category: Category }>;
  tags: ReportTag[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface SingleResponse<T> {
  data: T;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  bi_dashboard: 'BI Dashboard',
  pdf_report: 'PDF Report',
  web_report: 'Web / Embedded',
  sql_extract: 'SQL Extract',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  bi_dashboard: 'bg-blue-100 text-blue-800',
  pdf_report: 'bg-red-100 text-red-800',
  web_report: 'bg-green-100 text-green-800',
  sql_extract: 'bg-purple-100 text-purple-800',
};
