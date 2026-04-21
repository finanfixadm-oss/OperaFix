export type UserRole = "mandante" | "super_admin" | "worker";

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
  afp_payment_date?: string | null;
  client_notification_date?: string | null;
  created_at?: string;
  updated_at?: string;
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
  related_module?: string;
  related_record_id?: string | null;
  folder_id?: string | null;
  created_at: string;
}

export interface CrmFolder {
  id: string;
  name: string;
  module?: string | null;
  mandante?: string | null;
  parent_id?: string | null;
  created_at?: string;
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
  email?: string | null;
  address?: string | null;
  created_at?: string;
}

export interface Collaborator {
  id: string;
  full_name: string;
  email?: string | null;
  position?: string | null;
  phone?: string | null;
  company_id?: string | null;
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
  client_contract_status?: string | null;
  comment?: string | null;
  production_months?: string | null;
  created_at?: string;
}
