export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FilterOptions {
  entities: string[];
  statuses: string[];
}

export interface LmRecord {
  id: string;
  rut: string;
  search_group?: string | null;
  business_name?: string | null;
  entity?: string | null;
  management_status?: string | null;
  refund_amount?: string | number | null;
  confirmation_cc?: boolean | null;
  confirmation_power?: boolean | null;
  actual_paid_amount?: string | number | null;
  actual_finanfix_amount?: string | number | null;
  worker_status?: string | null;
  request_number?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  client_contract_status?: string | null;
  comment?: string | null;
  mandante?: string | null;
  portal_access?: string | null;
  connected_to?: string | null;
  request_entry_month?: string | null;
  afp_shipment?: string | null;
  cen_response?: string | null;
  cen_query?: string | null;
  cen_content?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}

export interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  original_filename: string;
  stored_filename: string;
  storage_path: string;
  related_module: string;
  related_record_id?: string | null;
  mime_type?: string | null;
  file_size?: number | string | null;
  created_at: string;
}

export interface LmRecordDetail extends LmRecord {
  notes: Note[];
  activities: Activity[];
  documents: DocumentItem[];
}

export interface LmRecordListResponse {
  items: LmRecord[];
  pagination: PaginationMeta;
  filters: FilterOptions;
}

export interface KpiOverview {
  totalRecords: number;
  paidRecords: number;
  pendingPower: number;
  pendingCC: number;
  totalRefund: number;
  totalFinanfix: number;
}

export interface AnalyticsGroup {
  entity?: string | null;
  management_status?: string | null;
  mandante?: string | null;
  _count: { _all: number };
  _sum?: { actual_finanfix_amount?: number | null; refund_amount?: number | null };
}

export interface AnalyticsDashboard {
  byEntity: AnalyticsGroup[];
  byStatus: AnalyticsGroup[];
  byMandante: AnalyticsGroup[];
  recentRecords: LmRecord[];
}

export interface Company {
  id: string;
  rut: string;
  business_name: string;
  mandante?: string | null;
  email?: string | null;
  address?: string | null;
  created_at?: string;
}

export interface Collaborator {
  id: string;
  full_name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: Company | null;
  created_at?: string;
}
