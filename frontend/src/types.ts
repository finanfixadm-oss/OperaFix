export interface LmRecord {
  id: string;
  rut: string;
  business_name?: string;
  entity?: string;
  management_status?: string;
  refund_amount?: string | number;
  confirmation_cc?: boolean;
  portal_access?: string;
}
