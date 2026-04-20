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
  created_at: string;
}

export interface LmRecordDetailResponse {
  record: LmRecord;
  notes: CrmNote[];
  activities: CrmActivity[];
  documents: CrmDocument[];
}
