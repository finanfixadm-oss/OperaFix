export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "includes_all"
  | "includes_any";

export type FilterFieldType = "text" | "select" | "boolean" | "date" | "number";

export type FilterRule = {
  field: string;
  label: string;
  type: FilterFieldType;
  enabled: boolean;
  operator: FilterOperator;
  value: string;
};

export type FilterFieldDefinition = {
  field: string;
  label: string;
  type: FilterFieldType;
  options?: Array<{ label: string; value: string }>;
};

export type Mandante = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
};

export type CompanyGroup = {
  id: string;
  name: string;
  group_type: "LM" | "TP";
  owner_name?: string | null;
  secondary_email?: string | null;
  campaign?: string | null;
  power_group_company?: string | null;
  associated_groups?: string | null;
  no_email_participation?: boolean | null;
  tag?: string | null;
  mandante?: Mandante | null;
};

export type Company = {
  id: string;
  razon_social: string;
  rut: string;
  owner_name?: string | null;
  email?: string | null;
  collaborator_1?: string | null;
  collaborator_2?: string | null;
  active_contract_status?: string | null;
  mandante?: Mandante | null;
  group?: CompanyGroup | null;
};

export type ManagementLine = {
  id: string;
  line_type: "LM" | "TP";
  name?: string | null;
  owner_name?: string | null;
  portal_access?: string | null;
  mes_produccion_2026?: string | null;
  comment?: string | null;
  estado_contrato_cliente?: string | null;
  fecha_termino_contrato?: string | null;
  consulta_cen?: string | null;
  contenido_cen?: string | null;
  respuesta_cen?: string | null;
  created_at: string;
  mandante?: Mandante | null;
  group?: CompanyGroup | null;
  company?: Company | null;
};

export type ManagementLineAfp = {
  id: string;
  afp_name: string;
  owner_name?: string | null;
  current_status?: string | null;
  created_at: string;
  line?: ManagementLine | null;
};

export type ManagementDocument = {
  id: string;
  management_id?: string | null;
  related_module: string;
  related_record_id: string;
  category: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by_id?: string | null;
  created_at: string;
};

export type Management = {
  id: string;
  mandante_id: string;
  company_id: string;
  line_id: string;
  line_afp_id?: string | null;
  management_type: "LM" | "TP";
  razon_social?: string | null;
  rut?: string | null;
  entidad?: string | null;
  estado_gestion?: string | null;
  numero_solicitud?: string | null;
  monto_devolucion?: number | null;
  monto_pagado?: number | null;
  banco?: string | null;
  numero_cuenta?: string | null;
  tipo_cuenta?: string | null;
  confirmacion_cc?: boolean | null;
  confirmacion_poder?: boolean | null;
  comment?: string | null;
  created_at: string;
  mandante?: Mandante | null;
  company?: Company | null;
  line?: ManagementLine | null;
  lineAfp?: ManagementLineAfp | null;
  documents?: ManagementDocument[];
};