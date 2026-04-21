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
  portal_access?: string | null;
  mandante?: string | null;
  comment?: string | null;
  request_number?: string | null;
  worker_status?: string | null;
  excess_type_reason?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  actual_paid_amount?: string | number | null;
  actual_finanfix_amount?: string | number | null;
  client_contract_status?: string | null;
  created_at?: string;
  updated_at?: string;
  last_activity_at?: string | null;
}

export interface LmRecordFilterOptions {
  entities: string[];
  statuses: string[];
  mandantes: string[];
}

export interface PaginatedLmRecords {
  items: LmRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filterOptions: LmRecordFilterOptions;
}

export interface CrmNote {
  id: string;
  content: string;
  created_at: string;
}

export interface CrmActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export interface CrmDocument {
  id: string;
  title: string;
  original_filename: string;
  stored_filename: string;
  storage_path: string;
  mime_type?: string | null;
  created_at: string;
}

export interface LmRecordDetailResponse {
  record: LmRecord;
  notes: CrmNote[];
  activities: CrmActivity[];
  documents: CrmDocument[];
}

export interface Company {
  id: string;
  rut: string;
  business_name: string;
  mandante?: string | null;
  address?: string | null;
  email?: string | null;
  estimated_amount?: string | number | null;
  created_at?: string;
}

export interface Collaborator {
  id: string;
  full_name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  company?: Company | null;
  created_at?: string;
}

export interface LmGroup {
  id: string;
  name: string;
  mandante?: string | null;
  secondary_email?: string | null;
  groups_related?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TpGroup {
  id: string;
  name: string;
  mandante?: string | null;
  email?: string | null;
  groups_related?: string | null;
  created_at?: string;
}

export interface TpRecord {
  id: string;
  mandante?: string | null;
  portal_access?: string | null;
  production_months?: string | null;
  comment?: string | null;
  client_contract_status?: string | null;
  cen_content?: string | null;
  cen_query?: string | null;
  created_at?: string;
}

export interface KpiOverview {
  totalRecords: number;
  paidRecords: number;
  pendingPower: number;
  pendingCC: number;
  totalRefund: number;
  totalFinanfix: number;
}

export interface AnalyticsBucket {
  entity?: string | null;
  management_status?: string | null;
  mandante?: string | null;
  _count: { _all: number };
  _sum?: {
    refund_amount?: number | null;
    actual_finanfix_amount?: number | null;
  };
}

export interface AnalyticsDashboard {
  byEntity: AnalyticsBucket[];
  byStatus: AnalyticsBucket[];
  byMandante: AnalyticsBucket[];
  recentRecords: Array<{
    id: string;
    rut: string;
    business_name?: string | null;
    entity?: string | null;
    management_status?: string | null;
    updated_at?: string;
    actual_finanfix_amount?: string | number | null;
  }>;
}
