import { useEffect, useMemo, useState, type DragEvent } from "react";
import { deleteJson, downloadBlob, fetchJson, postJson, putJson, uploadForm } from "../api";
import { getCurrentUser } from "../auth";
import "./kam-visual-pro.css";

type KamCompany = {
  id: string;
  rut: string;
  razon_social: string;
  nro_empleados?: number | null;
  monto_devolucion?: number | string | null;
  nombre_contacto?: string | null;
  cargo_contacto?: string | null;
  correo?: string | null;
  telefono?: string | null;
  telefono_central?: string | null;
  linkedin_url?: string | null;
  contactos_count?: number | null;
  estado?: string | null;
  observacion?: string | null;
  rubro?: string | null;
  region?: string | null;
  prioridad?: string | null;
  score_empresa?: number | null;
  segmento_empresa?: string | null;
  segmento_monto?: string | null;
  tipo_oportunidad?: string | null;
  origen?: string | null;
  kam_asignado_id?: string | null;
  kam_asignado_nombre?: string | null;
  kam_admin_nombre?: string | null;
  proxima_gestion?: string | null;
  probabilidad_cierre?: number | null;
  canal_origen?: string | null;
  campaign_id?: string | null;
  campaign_nombre?: string | null;
  source_company_id?: string | null;
  source_mandante_id?: string | null;
  source_mandante_name?: string | null;
  fecha_ultimo_contacto?: string | null;
  resultado_gestion?: string | null;
  motivo_perdida?: string | null;
};

type KamProfile = {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  nivel_experiencia: string;
  experiencia_licitaciones: number;
  experiencia_ventas: number;
  experiencia_recuperaciones: number;
  experiencia_empresas_grandes: number;
  experiencia_empresas_pequenas: number;
  rubros_experiencia?: string[];
  regiones_experiencia?: string[];
  capacidad_maxima: number;
  tasa_cierre: number;
  monto_cerrado_historico: number | string;
  ranking_kam: number;
  carga_actual?: number;
  score_match?: number;
  motivos?: string[];
  activo?: boolean;
};

type UserRow = { id: string; full_name: string; email: string; role: string; active?: boolean };

type KamCampaign = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  objetivo_monto?: number | string | null;
  empresas?: number;
  contactadas?: number;
  interesadas?: number;
  propuestas?: number;
  ganadas?: number;
  perdidas?: number;
  monto_potencial?: number | string;
  monto_ganado?: number | string;
};

type AgendaRow = {
  id: string;
  razon_social: string;
  rut: string;
  estado?: string | null;
  prioridad?: string | null;
  proxima_gestion?: string | null;
  fecha_ultimo_contacto?: string | null;
  monto_devolucion?: number | string | null;
  kam?: string | null;
  alerta?: string | null;
};

type RuleRow = {
  id: string;
  nombre_regla: string;
  criterio: string;
  operador: string;
  valor?: string | null;
  peso: number;
  accion: string;
  activa: boolean;
};

type KamActivity = {
  id: string;
  company_id: string;
  kam_nombre?: string | null;
  tipo_gestion: string;
  resultado?: string | null;
  proxima_accion?: string | null;
  proxima_gestion?: string | null;
  estado_venta?: string | null;
  probabilidad_cierre?: number | null;
  observacion?: string | null;
  created_at?: string | null;
};

type KamContact = {
  id: string;
  company_id: string;
  nombre: string;
  cargo?: string | null;
  correo?: string | null;
  telefono_contacto?: string | null;
  linkedin_url?: string | null;
  es_principal?: boolean;
  observacion?: string | null;
  created_at?: string | null;
};

const emptyActivity = {
  tipo_gestion: "Llamada",
  resultado: "",
  proxima_accion: "Hacer seguimiento",
  proxima_gestion: "",
  estado_venta: "Contactada",
  probabilidad_cierre: "",
  observacion: "",
};

type KamMetrics = {
  summary?: any;
  byKam?: Array<{
    kam: string;
    total: number;
    ganadas: number;
    perdidas: number;
    en_gestion: number;
    probabilidad_promedio: number | string;
    monto_potencial: number | string;
    monto_ganado: number | string;
    ultimo_contacto?: string | null;
  }>;
};

const emptyCompany = {
  rut: "",
  razon_social: "",
  nro_empleados: "",
  monto_devolucion: "",
  nombre_contacto: "",
  cargo_contacto: "",
  correo: "",
  telefono: "",
  telefono_central: "",
  linkedin_url: "",
  estado: "Sin asignar",
  observacion: "",
  rubro: "",
  region: "",
  tipo_oportunidad: "Recuperaciones",
  origen: "Carga manual",
  canal_origen: "",
  campaign_id: "",
  probabilidad_cierre: "",
  proxima_gestion: "",
};

const emptyContact = {
  nombre: "",
  cargo: "",
  correo: "",
  telefono_contacto: "",
  linkedin_url: "",
  es_principal: false,
  observacion: "",
};

const emptyProfile = {
  user_id: "",
  nivel_experiencia: "Junior",
  experiencia_licitaciones: 0,
  experiencia_ventas: 0,
  experiencia_recuperaciones: 0,
  experiencia_empresas_grandes: 0,
  experiencia_empresas_pequenas: 0,
  rubros_experiencia: "",
  regiones_experiencia: "",
  capacidad_maxima: 30,
  tasa_cierre: 0,
  monto_cerrado_historico: 0,
  activo: true,
};

const emptyRule = {
  nombre_regla: "",
  criterio: "monto_devolucion",
  operador: ">",
  valor: "",
  peso: 10,
  accion: "priorizar",
  activa: true,
};

const ESTADOS_VENTA = [
  "Sin asignar",
  "Asignada",
  "Pendiente de contacto",
  "En prospección",
  "Contactada",
  "Interesada",
  "Reunión agendada",
  "Propuesta enviada",
  "En negociación",
  "Ganada",
  "Perdida",
  "Congelada",
  "Reasignar",
];

const ESTADOS_GESTION = ["Asignada", "Pendiente de contacto", "En prospección", "Contactada", "Interesada", "Reunión agendada", "Propuesta enviada", "En negociación", "Reasignar"];

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function isOverdue(value?: string | null) {
  if (!value) return false;
  const d = new Date(String(value).slice(0, 10) + "T23:59:59");
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function money(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n === 0) return "—";
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function csv(value?: string[] | null) {
  return Array.isArray(value) && value.length ? value.join(", ") : "—";
}

export default function KamAssignmentPage() {
  const user = getCurrentUser();
  const canAdmin = ["admin", "kam_admin", "interno"].includes(String(user?.role || ""));
  const canConfigure = ["admin", "kam_admin"].includes(String(user?.role || ""));
  const [tab, setTab] = useState<"companies" | "profiles" | "rules" | "tracking" | "kanban" | "campaigns" | "agenda">("tracking");
  const [companies, setCompanies] = useState<KamCompany[]>([]);
  const [campaigns, setCampaigns] = useState<KamCampaign[]>([]);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [profiles, setProfiles] = useState<KamProfile[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterKam, setFilterKam] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterRubro, setFilterRubro] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSegment, setFilterSegment] = useState("");
  const [filterQuick, setFilterQuick] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [selected, setSelected] = useState<KamCompany | null>(null);
  const [activities, setActivities] = useState<KamActivity[]>([]);
  const [contacts, setContacts] = useState<KamContact[]>([]);
  const [contactForm, setContactForm] = useState<any>(emptyContact);
  const [draftContacts, setDraftContacts] = useState<any[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<any>(emptyActivity);
  const [companyForm, setCompanyForm] = useState<any>(emptyCompany);
  const [profileForm, setProfileForm] = useState<any>(emptyProfile);
  const [ruleForm, setRuleForm] = useState<any>(emptyRule);
  const [campaignForm, setCampaignForm] = useState<any>({ nombre: "", descripcion: "", estado: "Activa", fecha_inicio: "", fecha_fin: "", objetivo_monto: "" });
  const [importCampaignId, setImportCampaignId] = useState("");
  const [recommendations, setRecommendations] = useState<KamProfile[]>([]);
  const [metrics, setMetrics] = useState<KamMetrics>({});
  const [manualKamId, setManualKamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [draggingCompanyId, setDraggingCompanyId] = useState<string | null>(null);
  const [kanbanUpdatingId, setKanbanUpdatingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const companyPromise = fetchJson<KamCompany[]>("/kam/companies");
      const profilePromise = canAdmin || canConfigure
        ? fetchJson<KamProfile[]>("/kam/profiles")
        : Promise.resolve([] as KamProfile[]);
      const rulePromise = canConfigure
        ? fetchJson<RuleRow[]>("/kam/rules")
        : Promise.resolve([] as RuleRow[]);
      const metricsPromise = fetchJson<KamMetrics>("/kam/metrics");
      const campaignPromise = canAdmin ? fetchJson<KamCampaign[]>("/kam/campaigns") : Promise.resolve([] as KamCampaign[]);
      const agendaPromise = fetchJson<AgendaRow[]>("/kam/agenda").catch(() => [] as AgendaRow[]);

      const [companyRows, profileRows, ruleRows, metricRows, campaignRows, agendaRows] = await Promise.all([
        companyPromise,
        profilePromise,
        rulePromise,
        metricsPromise,
        campaignPromise,
        agendaPromise,
      ]);

      setCompanies(companyRows || []);
      setProfiles(profileRows || []);
      setRules(ruleRows || []);
      setMetrics(metricRows || {});
      setCampaigns(campaignRows || []);
      setAgenda(agendaRows || []);

      if (canConfigure) {
        const userRows = await fetchJson<UserRow[]>("/kam/users").catch(() => [] as UserRow[]);
        setUsers(userRows.filter((item) => String(item.role).toLowerCase() === "kam" && item.active !== false));
      }
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("debes iniciar sesión") || message.includes("401")) {
        alert("Tu sesión venció o el token anterior quedó inválido después de la actualización. Inicia sesión nuevamente.");
        window.location.href = "/login";
        return;
      }
      alert(message || "No se pudo cargar el módulo KAM.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filterOptions = useMemo(() => ({
    kams: uniqueSorted(companies.map((x) => x.kam_asignado_nombre || (!x.kam_asignado_id ? "Sin asignar" : ""))),
    rubros: uniqueSorted(companies.map((x) => x.rubro)),
    regiones: uniqueSorted(companies.map((x) => x.region)),
    segmentos: uniqueSorted(companies.map((x) => x.segmento_empresa)),
    campaigns: uniqueSorted(companies.map((x) => x.campaign_nombre)),
  }), [companies]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((row) => {
      const assignedName = row.kam_asignado_nombre || (!row.kam_asignado_id ? "Sin asignar" : "");
      const quickOk = !filterQuick
        || (filterQuick === "sin_asignar" && !row.kam_asignado_id)
        || (filterQuick === "estrategicas" && row.prioridad === "Estratégica")
        || (filterQuick === "vencidas" && isOverdue(row.proxima_gestion))
        || (filterQuick === "sin_contacto" && !row.fecha_ultimo_contacto && Boolean(row.kam_asignado_id))
        || (filterQuick === "ganadas" && row.estado === "Ganada")
        || (filterQuick === "perdidas" && row.estado === "Perdida")
        || (filterQuick === "reasignar" && row.estado === "Reasignar");
      const qOk = !q || [row.rut, row.razon_social, row.rubro, row.region, row.estado, row.prioridad, row.kam_asignado_nombre, row.correo, row.telefono, row.telefono_central, row.linkedin_url]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      return qOk
        && (!filterKam || assignedName === filterKam)
        && (!filterEstado || row.estado === filterEstado)
        && (!filterRubro || row.rubro === filterRubro)
        && (!filterRegion || row.region === filterRegion)
        && (!filterPriority || row.prioridad === filterPriority)
        && (!filterSegment || row.segmento_empresa === filterSegment)
        && (!filterCampaign || row.campaign_nombre === filterCampaign || row.campaign_id === filterCampaign)
        && quickOk;
    });
  }, [companies, search, filterKam, filterEstado, filterRubro, filterRegion, filterPriority, filterSegment, filterQuick, filterCampaign]);

  const dashboard = useMemo(() => {
    const rows = filteredCompanies;
    const amount = (items: KamCompany[]) => items.reduce((sum, item) => sum + Number(item.monto_devolucion || 0), 0);
    const total = rows.length;
    const sinAsignar = rows.filter((x) => !x.kam_asignado_id).length;
    const enGestion = rows.filter((x) => ESTADOS_GESTION.includes(String(x.estado || ""))).length;
    const ganadas = rows.filter((x) => x.estado === "Ganada").length;
    const perdidas = rows.filter((x) => x.estado === "Perdida").length;
    const vencidas = rows.filter((x) => isOverdue(x.proxima_gestion)).length;
    const sinContacto = rows.filter((x) => x.kam_asignado_id && !x.fecha_ultimo_contacto).length;
    const montoPotencial = amount(rows);
    const montoGanado = amount(rows.filter((x) => x.estado === "Ganada"));
    const probPromedio = rows.length ? rows.reduce((sum, x) => sum + Number(x.probabilidad_cierre || 0), 0) / rows.length : 0;
    const byEstado = ESTADOS_VENTA.map((estado) => {
      const items = rows.filter((x) => String(x.estado || "Sin asignar") === estado);
      return { estado, total: items.length, monto: amount(items) };
    }).filter((x) => x.total > 0);
    const byKam = Array.from(new Set(rows.map((x) => x.kam_asignado_nombre || (!x.kam_asignado_id ? "Sin asignar" : "KAM sin nombre")))).sort((a, b) => a.localeCompare(b, "es")).map((kam) => {
      const items = rows.filter((x) => (x.kam_asignado_nombre || (!x.kam_asignado_id ? "Sin asignar" : "KAM sin nombre")) === kam);
      const won = items.filter((x) => x.estado === "Ganada");
      const lost = items.filter((x) => x.estado === "Perdida");
      const active = items.filter((x) => ESTADOS_GESTION.includes(String(x.estado || "")));
      const prob = items.length ? items.reduce((sum, x) => sum + Number(x.probabilidad_cierre || 0), 0) / items.length : 0;
      const conversionBase = won.length + lost.length;
      return {
        kam,
        total: items.length,
        activas: active.length,
        ganadas: won.length,
        perdidas: lost.length,
        vencidas: items.filter((x) => isOverdue(x.proxima_gestion)).length,
        sin_contacto: items.filter((x) => x.kam_asignado_id && !x.fecha_ultimo_contacto).length,
        probabilidad: prob,
        conversion: conversionBase ? (won.length / conversionBase) * 100 : 0,
        monto_potencial: amount(items),
        monto_ganado: amount(won),
      };
    });
    return { total, sinAsignar, enGestion, ganadas, perdidas, vencidas, sinContacto, montoPotencial, montoGanado, probPromedio, byEstado, byKam };
  }, [filteredCompanies]);

  const clearFilters = () => {
    setSearch("");
    setFilterKam("");
    setFilterEstado("");
    setFilterRubro("");
    setFilterRegion("");
    setFilterPriority("");
    setFilterSegment("");
    setFilterQuick("");
    setFilterCampaign("");
  };

  const kpis = useMemo(() => {
    const strategic = companies.filter((x) => x.prioridad === "Estratégica").length;
    const unassigned = companies.filter((x) => !x.kam_asignado_id).length;
    const totalAmount = companies.reduce((sum, x) => sum + Number(x.monto_devolucion || 0), 0);
    return { total: companies.length, strategic, unassigned, totalAmount };
  }, [companies]);

  async function editCompany(row: KamCompany) {
    setSelected(row);
    setCompanyForm({
      ...emptyCompany,
      ...row,
      nro_empleados: row.nro_empleados || "",
      monto_devolucion: row.monto_devolucion || "",
      nombre_contacto: row.nombre_contacto || "",
      cargo_contacto: row.cargo_contacto || "",
      telefono: row.telefono || "",
      telefono_central: row.telefono_central || "",
      linkedin_url: row.linkedin_url || "",
      probabilidad_cierre: row.probabilidad_cierre || "",
      campaign_id: row.campaign_id || "",
      proxima_gestion: row.proxima_gestion ? String(row.proxima_gestion).slice(0, 10) : "",
    });
    setManualKamId(row.kam_asignado_id || "");
    setRecommendations([]);
    setActivityForm({
      ...emptyActivity,
      estado_venta: row.estado || "Contactada",
      proxima_gestion: row.proxima_gestion ? String(row.proxima_gestion).slice(0, 10) : "",
      probabilidad_cierre: row.probabilidad_cierre || "",
    });
    const rows = await fetchJson<KamActivity[]>(`/kam/companies/${row.id}/activities`).catch(() => [] as KamActivity[]);
    setActivities(rows);
    const contactRows = await fetchJson<KamContact[]>(`/kam/companies/${row.id}/contacts`).catch(() => [] as KamContact[]);
    setContacts(contactRows);
    setContactForm(emptyContact);
    setDraftContacts([]);
    setEditingContactId(null);
  }

  async function saveCompany() {
    setSaveMessage("");
    if (!companyForm.rut || !companyForm.razon_social) {
      alert("Debes ingresar RUT y Razón Social.");
      return;
    }
    if (!selected) {
      const rutNorm = String(companyForm.rut || "").toUpperCase().replace(/[^0-9K]/g, "");
      const razonNorm = String(companyForm.razon_social || "").trim().toLowerCase();
      const exists = companies.some((item) => {
        const itemRut = String(item.rut || "").toUpperCase().replace(/[^0-9K]/g, "");
        const itemRazon = String(item.razon_social || "").trim().toLowerCase();
        return (!!rutNorm && itemRut === rutNorm) || (!!razonNorm && itemRazon === razonNorm);
      });
      if (exists) {
        alert("No se puede crear la empresa porque ya existe un registro con el mismo RUT o razón social.");
        return;
      }
    }
    if (companyForm.estado === "Perdida" && !companyForm.motivo_perdida) {
      alert("Debes ingresar motivo de pérdida antes de marcar la empresa como Perdida.");
      return;
    }
    if (selected && selected.kam_asignado_id && !["Ganada", "Perdida", "Congelada"].includes(companyForm.estado) && !companyForm.proxima_gestion) {
      alert("Debes ingresar una próxima gestión para que la empresa no quede abandonada.");
      return;
    }
    try {
      const wasEditing = Boolean(selected);
      const cleanDraftContacts = draftContacts.filter((c) => String(c?.nombre || "").trim());
      if (selected) {
        await putJson(`/kam/companies/${selected.id}`, { ...companyForm, actividad_tipo: "Actualización", actividad_observacion: companyForm.observacion });
      } else {
        await postJson<KamCompany>("/kam/companies", { ...companyForm, contactos: cleanDraftContacts });
      }
      setCompanyForm(emptyCompany);
      setSelected(null);
      setContacts([]);
      setDraftContacts([]);
      setContactForm(emptyContact);
      setEditingContactId(null);
      setSaveMessage(wasEditing ? "Empresa actualizada correctamente." : `Empresa creada correctamente${cleanDraftContacts.length ? ` con ${cleanDraftContacts.length} contacto(s).` : "."}`);
      await loadAll();
    } catch (error: any) {
      alert(error?.message || "No se pudo guardar la empresa.");
    }
  }

  async function saveActivity() {
    if (!selected) {
      alert("Selecciona una empresa para registrar gestión.");
      return;
    }
    if (!activityForm.observacion && !activityForm.resultado) {
      alert("Ingresa resultado u observación de la gestión.");
      return;
    }
    if (activityForm.estado_venta === "Perdida" && !companyForm.motivo_perdida && !activityForm.observacion) {
      alert("Para registrar pérdida debes indicar motivo u observación.");
      return;
    }
    await postJson(`/kam/companies/${selected.id}/activities`, {
      ...activityForm,
      motivo_perdida: companyForm.motivo_perdida,
    });
    const rows = await fetchJson<KamActivity[]>(`/kam/companies/${selected.id}/activities`).catch(() => [] as KamActivity[]);
    setActivities(rows);
    setActivityForm(emptyActivity);
    await loadAll();
    setSaveMessage("Gestión registrada correctamente.");
  }

  async function refreshContacts(companyId?: string) {
    const id = companyId || selected?.id;
    if (!id) return;
    const rows = await fetchJson<KamContact[]>(`/kam/companies/${id}/contacts`).catch(() => [] as KamContact[]);
    setContacts(rows);
  }

  function addDraftContact() {
    const next = { ...contactForm, es_principal: draftContacts.length === 0 ? true : Boolean(contactForm.es_principal) };
    if (!String(next.nombre || "").trim()) {
      alert("Debes ingresar el nombre del contacto.");
      return;
    }
    if (!next.correo && !next.telefono_contacto && !next.linkedin_url) {
      alert("Debes ingresar al menos correo, teléfono o LinkedIn del contacto.");
      return;
    }
    setDraftContacts((prev) => {
      const cleaned = next.es_principal ? prev.map((c) => ({ ...c, es_principal: false })) : prev;
      return [...cleaned, next];
    });
    if (next.es_principal) {
      setCompanyForm((prev: any) => ({
        ...prev,
        nombre_contacto: next.nombre || prev.nombre_contacto,
        cargo_contacto: next.cargo || prev.cargo_contacto,
        correo: next.correo || prev.correo,
        telefono: next.telefono_contacto || prev.telefono,
      }));
    }
    setContactForm(emptyContact);
  }

  function removeDraftContact(index: number) {
    setDraftContacts((prev) => prev.filter((_, idx) => idx !== index));
  }

  function promoteDraftContact(index: number) {
    setDraftContacts((prev) => prev.map((c, idx) => ({ ...c, es_principal: idx === index })));
    const contact = draftContacts[index];
    if (contact) {
      setCompanyForm((prev: any) => ({
        ...prev,
        nombre_contacto: contact.nombre || prev.nombre_contacto,
        cargo_contacto: contact.cargo || prev.cargo_contacto,
        correo: contact.correo || prev.correo,
        telefono: contact.telefono_contacto || prev.telefono,
      }));
    }
  }

  async function saveContact() {
    if (!selected) {
      alert("Selecciona una empresa antes de agregar contactos.");
      return;
    }
    if (!contactForm.nombre) {
      alert("Debes ingresar el nombre del contacto.");
      return;
    }
    if (!contactForm.correo && !contactForm.telefono_contacto && !contactForm.linkedin_url) {
      alert("Debes ingresar al menos correo, teléfono o LinkedIn del contacto.");
      return;
    }
    try {
      if (editingContactId) await putJson(`/kam/contacts/${editingContactId}`, contactForm);
      else await postJson(`/kam/companies/${selected.id}/contacts`, contactForm);
      setContactForm(emptyContact);
      setEditingContactId(null);
      await refreshContacts(selected.id);
      setSaveMessage(editingContactId ? "Contacto actualizado correctamente." : "Contacto agregado correctamente.");
      await loadAll();
    } catch (error: any) {
      alert(error?.message || "No se pudo guardar el contacto.");
    }
  }

  function editContact(contact: KamContact) {
    setEditingContactId(contact.id);
    setContactForm({
      nombre: contact.nombre || "",
      cargo: contact.cargo || "",
      correo: contact.correo || "",
      telefono_contacto: contact.telefono_contacto || "",
      linkedin_url: contact.linkedin_url || "",
      es_principal: Boolean(contact.es_principal),
      observacion: contact.observacion || "",
    });
  }

  async function deleteContact(contact: KamContact) {
    if (!window.confirm(`¿Eliminar el contacto ${contact.nombre}?`)) return;
    try {
      await deleteJson(`/kam/contacts/${contact.id}`);
      await refreshContacts(selected?.id);
      setSaveMessage("Contacto eliminado correctamente.");
      await loadAll();
    } catch (error: any) {
      alert(error?.message || "No se pudo eliminar el contacto.");
    }
  }

  async function deleteCompany(row: KamCompany) {
    if (!canAdmin) return;
    if (!window.confirm(`¿Eliminar la empresa ${row.razon_social}? Esta acción eliminará también contactos, bitácora e historial KAM.`)) return;
    try {
      await deleteJson(`/kam/companies/${row.id}`);
      setSelected(null);
      setCompanyForm(emptyCompany);
      setContacts([]);
      setActivities([]);
      setSaveMessage("Empresa eliminada correctamente.");
      await loadAll();
    } catch (error: any) {
      alert(error?.message || "No se pudo eliminar la empresa.");
    }
  }


  async function recommend(row: KamCompany) {
    setSelected(row);
    setCompanyForm({ ...emptyCompany, ...row });
    const result = await fetchJson<{ recommendations: KamProfile[] }>(`/kam/recommend/${row.id}`);
    setRecommendations(result.recommendations || []);
  }

  async function assign(row: KamCompany, profile: KamProfile) {
    await postJson(`/kam/companies/${row.id}/assign`, {
      kam_asignado_id: profile.user_id,
      score_match: profile.score_match,
      motivo_asignacion: `Asignado por compatibilidad: score ${profile.score_match}`,
      observacion: (profile.motivos || []).join("; "),
    });
    setRecommendations([]);
    await loadAll();
    setSaveMessage("Empresa asignada correctamente.");
  }

  async function assignManual() {
    if (!selected) {
      alert("Primero selecciona una empresa.");
      return;
    }
    if (!manualKamId) {
      alert("Debes seleccionar un KAM vendedor.");
      return;
    }
    await postJson(`/kam/companies/${selected.id}/assign`, {
      kam_asignado_id: manualKamId,
      motivo_asignacion: "Asignación manual por KAM administrador",
      observacion: companyForm.observacion || "Asignación manual",
    });
    setRecommendations([]);
    await loadAll();
    setSaveMessage("Asignación manual guardada correctamente.");
  }

  function editProfile(profile: KamProfile) {
    setProfileForm({
      user_id: profile.user_id,
      nivel_experiencia: profile.nivel_experiencia || "Junior",
      experiencia_licitaciones: profile.experiencia_licitaciones || 0,
      experiencia_ventas: profile.experiencia_ventas || 0,
      experiencia_recuperaciones: profile.experiencia_recuperaciones || 0,
      experiencia_empresas_grandes: profile.experiencia_empresas_grandes || 0,
      experiencia_empresas_pequenas: profile.experiencia_empresas_pequenas || 0,
      rubros_experiencia: (profile.rubros_experiencia || []).join(", "),
      regiones_experiencia: (profile.regiones_experiencia || []).join(", "),
      capacidad_maxima: profile.capacidad_maxima || 30,
      tasa_cierre: profile.tasa_cierre || 0,
      monto_cerrado_historico: profile.monto_cerrado_historico || 0,
      activo: profile.activo !== false,
    });
  }

  async function saveProfile() {
    if (!profileForm.user_id) {
      alert("Debes seleccionar un KAM vendedor.");
      return;
    }
    await postJson("/kam/profiles", profileForm);
    setProfileForm(emptyProfile);
    await loadAll();
    setSaveMessage("Perfil KAM guardado correctamente.");
  }

  async function saveRule() {
    if (!ruleForm.nombre_regla) {
      alert("Debes ingresar el nombre de la regla.");
      return;
    }
    await postJson("/kam/rules", ruleForm);
    setRuleForm(emptyRule);
    await loadAll();
    setSaveMessage("Regla guardada correctamente.");
  }


  async function saveCampaign() {
    if (!campaignForm.nombre) {
      alert("Debes ingresar el nombre de la campaña.");
      return;
    }
    await postJson("/kam/campaigns", campaignForm);
    setCampaignForm({ nombre: "", descripcion: "", estado: "Activa", fecha_inicio: "", fecha_fin: "", objetivo_monto: "" });
    await loadAll();
    setSaveMessage("Campaña guardada correctamente.");
  }

  async function importExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    if (importCampaignId) form.append("campaign_id", importCampaignId);
    try {
      const result = await uploadForm<any>("/kam/companies/import-excel", form);
      setSaveMessage(`Importación lista: ${result.creadas || 0} creadas, ${result.duplicadas || 0} duplicadas, ${result.conError || 0} con error.`);
      await loadAll();
    } catch (error: any) {
      alert(error?.message || "No se pudo importar el Excel.");
    } finally {
      event.target.value = "";
    }
  }

  async function exportCompanies() {
    await downloadBlob("/kam/companies/export-excel", {
      estado: filterEstado || undefined,
      rubro: filterRubro || undefined,
      region: filterRegion || undefined,
      prioridad: filterPriority || undefined,
      campaign_id: filterCampaign && campaigns.find((c) => c.nombre === filterCampaign)?.id ? campaigns.find((c) => c.nombre === filterCampaign)?.id : undefined,
    }, "empresas_kam.xlsx");
  }

  function tomorrowDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  async function moveKanbanCard(row: KamCompany, nuevoEstado: string) {
    const estadoActual = String(row.estado || "Sin asignar");
    if (estadoActual === nuevoEstado || kanbanUpdatingId) return;

    let motivo_perdida = row.motivo_perdida || "";
    if (nuevoEstado === "Perdida" && !motivo_perdida) {
      const motivo = window.prompt("Indica el motivo de pérdida para mover esta empresa a Perdida:");
      if (!motivo || !motivo.trim()) return;
      motivo_perdida = motivo.trim();
    }

    const proximaGestion = row.proxima_gestion
      ? String(row.proxima_gestion).slice(0, 10)
      : row.kam_asignado_id && !["Ganada", "Perdida", "Congelada"].includes(nuevoEstado)
        ? tomorrowDate()
        : "";

    setKanbanUpdatingId(row.id);
    try {
      await putJson(`/kam/companies/${row.id}`, {
        estado: nuevoEstado,
        motivo_perdida,
        proxima_gestion: proximaGestion || null,
        actividad_tipo: "Cambio de estado por Kanban",
        actividad_observacion: `Tarjeta movida desde ${estadoActual} a ${nuevoEstado}.`,
      });
      setCompanies((prev) => prev.map((item) => item.id === row.id ? { ...item, estado: nuevoEstado, motivo_perdida, proxima_gestion: proximaGestion || item.proxima_gestion } : item));
      await loadAll();
      setSaveMessage("Estado actualizado correctamente desde Kanban.");
    } catch (error: any) {
      alert(error?.message || "No se pudo cambiar el estado desde el Kanban.");
    } finally {
      setKanbanUpdatingId(null);
      setDraggingCompanyId(null);
    }
  }

  function estadoClass(value?: string | null) {
    const key = String(value || "sin-asignar").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    return `kam-badge estado-${key}`;
  }

  function prioridadClass(value?: string | null) {
    const key = String(value || "baja").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    return `kam-badge prioridad-${key}`;
  }

  function onKanbanDragStart(event: DragEvent<HTMLElement>, row: KamCompany) {
    event.dataTransfer.setData("text/plain", row.id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingCompanyId(row.id);
  }

  async function onKanbanDrop(event: DragEvent<HTMLElement>, nuevoEstado: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingCompanyId;
    const row = companies.find((item) => item.id === id);
    if (!row) {
      setDraggingCompanyId(null);
      return;
    }
    await moveKanbanCard(row, nuevoEstado);
  }

  return (
    <div className="zoho-module-page kam-module-page kam-visual-pro">
      <div className="zoho-module-header kam-pro-hero">
        <div>
          <div className="kam-pro-eyebrow">CRM Comercial FinanFix</div>
          <h1>Asignación y Seguimiento KAM</h1>
          <p>Panel profesional para cartera propia, asignación manual, seguimiento comercial, Kanban, campañas y control por vendedor.</p>
        </div>
        <div className="zoho-module-actions">
          <button className={tab === "companies" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("companies")}>Empresas</button>
          <button className={tab === "tracking" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("tracking")}>Dashboard KAM</button>
          <button className={tab === "kanban" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("kanban")}>Kanban</button>
          <button className={tab === "agenda" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("agenda")}>Agenda</button>
          {canAdmin && <button className={tab === "campaigns" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("campaigns")}>Campañas / Excel</button>}
          <button className={tab === "profiles" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("profiles")}>Ranking KAM</button>
          <button className={tab === "rules" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("rules")}>Reglas</button>
        </div>
      </div>

      <div className="zoho-kpi-grid kam-pro-kpis">
        <div className="zoho-card kam-kpi-card"><span className="kam-kpi-icon">🏢</span><strong>{metrics.summary?.total_empresas ?? kpis.total}</strong><span>Empresas potenciales</span></div>
        <div className="zoho-card kam-kpi-card success"><span className="kam-kpi-icon">✅</span><strong>{metrics.summary?.ganadas ?? 0}</strong><span>Ganadas</span></div>
        <div className="zoho-card kam-kpi-card warning"><span className="kam-kpi-icon">📌</span><strong>{metrics.summary?.sin_asignar ?? kpis.unassigned}</strong><span>Sin asignar</span></div>
        <div className="zoho-card kam-kpi-card money"><span className="kam-kpi-icon">💰</span><strong>{money(metrics.summary?.monto_potencial ?? kpis.totalAmount)}</strong><span>Monto potencial</span></div>
      </div>

      {saveMessage && <div className="zoho-card kam-save-message"><strong>{saveMessage}</strong><button className="zoho-small-btn" type="button" onClick={() => setSaveMessage("")}>Cerrar</button></div>}

      <section className="zoho-card kam-dashboard-card">
        <div className="zoho-table-toolbar">
          <strong>Filtros comerciales</strong>
          <button className="zoho-small-btn" type="button" onClick={clearFilters}>Limpiar filtros</button>
          <button className="zoho-small-btn primary" type="button" onClick={exportCompanies}>Exportar Excel</button>
        </div>
        <div className="zoho-form-grid kam-filter-grid">
          <Field label="Buscar"><input className="zoho-input" placeholder="RUT, razón social, rubro, región, correo, teléfono" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
          <Field label="KAM"><select className="zoho-input" value={filterKam} onChange={(e) => setFilterKam(e.target.value)}><option value="">Todos</option>{filterOptions.kams.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Estado venta"><select className="zoho-input" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}><option value="">Todos</option>{ESTADOS_VENTA.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Rubro"><select className="zoho-input" value={filterRubro} onChange={(e) => setFilterRubro(e.target.value)}><option value="">Todos</option>{filterOptions.rubros.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Región"><select className="zoho-input" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}><option value="">Todas</option>{filterOptions.regiones.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Campaña"><select className="zoho-input" value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}><option value="">Todas</option>{filterOptions.campaigns.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Prioridad"><select className="zoho-input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}><option value="">Todas</option><option>Estratégica</option><option>Alta</option><option>Media</option><option>Baja</option></select></Field>
          <Field label="Tamaño empresa"><select className="zoho-input" value={filterSegment} onChange={(e) => setFilterSegment(e.target.value)}><option value="">Todos</option>{filterOptions.segmentos.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
          <Field label="Vista rápida"><select className="zoho-input" value={filterQuick} onChange={(e) => setFilterQuick(e.target.value)}><option value="">Todas</option><option value="sin_asignar">Sin asignar</option><option value="estrategicas">Estratégicas</option><option value="vencidas">Gestiones vencidas</option><option value="sin_contacto">Sin primer contacto</option><option value="ganadas">Ganadas</option><option value="perdidas">Perdidas</option><option value="reasignar">Reasignar</option></select></Field>
        </div>
      </section>

      {tab === "companies" && (
        <div className="mandantes-layout">
          <aside className="zoho-filter-panel">
            <h2>{selected ? "Editar empresa" : "Nueva empresa"}</h2>
            {!canAdmin && (
              selected ? (
                <div className="zoho-form-grid single-column-form">
                  <p className="zoho-help-text">Actualiza el seguimiento de la empresa asignada. Solo ves empresas de tu cartera.</p>
                  <Field label="Empresa"><input className="zoho-input" value={companyForm.razon_social} disabled /></Field>
                  <Field label="Estado">
                    <select className="zoho-input" value={companyForm.estado} onChange={(e) => setCompanyForm({ ...companyForm, estado: e.target.value })}>
                      {ESTADOS_VENTA.filter((x) => x !== "Sin asignar").map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Field>
                  <Field label="Próxima gestión"><input className="zoho-input" type="date" value={companyForm.proxima_gestion} onChange={(e) => setCompanyForm({ ...companyForm, proxima_gestion: e.target.value })} /></Field>
                  <Field label="Probabilidad cierre %"><input className="zoho-input" type="number" min={0} max={100} value={companyForm.probabilidad_cierre} onChange={(e) => setCompanyForm({ ...companyForm, probabilidad_cierre: e.target.value })} /></Field>
                  <Field label="Resultado gestión"><input className="zoho-input" value={companyForm.resultado_gestion || ""} onChange={(e) => setCompanyForm({ ...companyForm, resultado_gestion: e.target.value })} /></Field>
                  <Field label="Motivo pérdida"><input className="zoho-input" value={companyForm.motivo_perdida || ""} onChange={(e) => setCompanyForm({ ...companyForm, motivo_perdida: e.target.value })} /></Field>
                  <Field label="Observación"><textarea className="zoho-input" rows={4} value={companyForm.observacion} onChange={(e) => setCompanyForm({ ...companyForm, observacion: e.target.value })} /></Field>
                  <button className="zoho-btn zoho-btn-primary" onClick={saveCompany}>Guardar seguimiento</button>
                </div>
              ) : <p className="zoho-help-text">Selecciona una empresa de tu cartera para actualizar el seguimiento.</p>
            )}
            {canAdmin && (
              <div className="zoho-form-grid single-column-form">
                <Field label="RUT"><input className="zoho-input" value={companyForm.rut} onChange={(e) => setCompanyForm({ ...companyForm, rut: e.target.value })} /></Field>
                <Field label="Razón Social"><input className="zoho-input" value={companyForm.razon_social} onChange={(e) => setCompanyForm({ ...companyForm, razon_social: e.target.value })} /></Field>
                <Field label="Nro Empleados"><input className="zoho-input" type="number" value={companyForm.nro_empleados} onChange={(e) => setCompanyForm({ ...companyForm, nro_empleados: e.target.value })} /></Field>
                <Field label="Monto Devolución"><input className="zoho-input" type="number" value={companyForm.monto_devolucion} onChange={(e) => setCompanyForm({ ...companyForm, monto_devolucion: e.target.value })} /></Field>
                <Field label="Rubro"><input className="zoho-input" value={companyForm.rubro} onChange={(e) => setCompanyForm({ ...companyForm, rubro: e.target.value })} /></Field>
                <Field label="Región"><input className="zoho-input" value={companyForm.region} onChange={(e) => setCompanyForm({ ...companyForm, region: e.target.value })} /></Field>
                <Field label="Nombre contacto"><input className="zoho-input" value={companyForm.nombre_contacto} onChange={(e) => setCompanyForm({ ...companyForm, nombre_contacto: e.target.value })} /></Field>
                <Field label="Cargo"><input className="zoho-input" value={companyForm.cargo_contacto} onChange={(e) => setCompanyForm({ ...companyForm, cargo_contacto: e.target.value })} /></Field>
                <Field label="Correo"><input className="zoho-input" value={companyForm.correo} onChange={(e) => setCompanyForm({ ...companyForm, correo: e.target.value })} /></Field>
                <Field label="Nro Telefónico contacto"><input className="zoho-input" value={companyForm.telefono} onChange={(e) => setCompanyForm({ ...companyForm, telefono: e.target.value })} /></Field>
                <Field label="Nro Telefónico central / empresa"><input className="zoho-input" value={companyForm.telefono_central} onChange={(e) => setCompanyForm({ ...companyForm, telefono_central: e.target.value })} /></Field>
                <Field label="LinkedIn empresa"><input className="zoho-input" placeholder="https://www.linkedin.com/company/..." value={companyForm.linkedin_url} onChange={(e) => setCompanyForm({ ...companyForm, linkedin_url: e.target.value })} /></Field>
                <Field label="Campaña comercial">
                  <select className="zoho-input" value={companyForm.campaign_id || ""} onChange={(e) => setCompanyForm({ ...companyForm, campaign_id: e.target.value })}>
                    <option value="">Sin campaña</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </Field>
                <Field label="Tipo oportunidad">
                  <select className="zoho-input" value={companyForm.tipo_oportunidad} onChange={(e) => setCompanyForm({ ...companyForm, tipo_oportunidad: e.target.value })}>
                    <option>Recuperaciones</option><option>Ventas propias</option><option>Licitaciones</option><option>Referido</option><option>Campaña</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select className="zoho-input" value={companyForm.estado} onChange={(e) => setCompanyForm({ ...companyForm, estado: e.target.value })}>
                    <option>Sin asignar</option>{ESTADOS_VENTA.filter((x) => x !== "Sin asignar").map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="Próxima gestión"><input className="zoho-input" type="date" value={companyForm.proxima_gestion} onChange={(e) => setCompanyForm({ ...companyForm, proxima_gestion: e.target.value })} /></Field>
                <Field label="Probabilidad cierre %"><input className="zoho-input" type="number" min={0} max={100} value={companyForm.probabilidad_cierre} onChange={(e) => setCompanyForm({ ...companyForm, probabilidad_cierre: e.target.value })} /></Field>
                <Field label="Resultado gestión"><input className="zoho-input" value={companyForm.resultado_gestion || ""} onChange={(e) => setCompanyForm({ ...companyForm, resultado_gestion: e.target.value })} /></Field>
                <Field label="Motivo pérdida"><input className="zoho-input" value={companyForm.motivo_perdida || ""} onChange={(e) => setCompanyForm({ ...companyForm, motivo_perdida: e.target.value })} /></Field>
                {!selected && (
                  <div className="kam-contact-builder">
                    <div className="kam-section-title">
                      <strong>Contactos adicionales</strong>
                      <span>Puedes crear 1, 2, 3 o más contactos antes de guardar la empresa.</span>
                    </div>
                    <div className="kam-contact-builder-grid">
                      <input className="zoho-input" placeholder="Nombre contacto" value={contactForm.nombre} onChange={(e) => setContactForm({ ...contactForm, nombre: e.target.value })} />
                      <input className="zoho-input" placeholder="Cargo" value={contactForm.cargo} onChange={(e) => setContactForm({ ...contactForm, cargo: e.target.value })} />
                      <input className="zoho-input" placeholder="Correo" value={contactForm.correo} onChange={(e) => setContactForm({ ...contactForm, correo: e.target.value })} />
                      <input className="zoho-input" placeholder="Teléfono contacto" value={contactForm.telefono_contacto} onChange={(e) => setContactForm({ ...contactForm, telefono_contacto: e.target.value })} />
                      <input className="zoho-input" placeholder="LinkedIn contacto" value={contactForm.linkedin_url} onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })} />
                      <label className="kam-checkbox-line"><input type="checkbox" checked={Boolean(contactForm.es_principal)} onChange={(e) => setContactForm({ ...contactForm, es_principal: e.target.checked })} /> Principal</label>
                      <button className="zoho-small-btn primary" type="button" onClick={addDraftContact}>Agregar contacto</button>
                    </div>
                    {draftContacts.length > 0 && (
                      <div className="kam-draft-contact-list">
                        {draftContacts.map((c, idx) => (
                          <div className="kam-draft-contact" key={`${c.nombre}-${idx}`}>
                            <div><strong>{c.nombre}</strong><span>{c.cargo || "Sin cargo"} · {c.correo || c.telefono_contacto || c.linkedin_url}</span></div>
                            <div className="zoho-actions-row compact-actions">
                              {!c.es_principal && <button className="zoho-small-btn" type="button" onClick={() => promoteDraftContact(idx)}>Principal</button>}
                              {c.es_principal && <span className="kam-badge success">Principal</span>}
                              <button className="zoho-small-btn danger" type="button" onClick={() => removeDraftContact(idx)}>Quitar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {selected && canConfigure && (
                  <Field label="Asignar manualmente a KAM vendedor">
                    <div className="zoho-actions-row">
                      <select className="zoho-input" value={manualKamId} onChange={(e) => setManualKamId(e.target.value)}>
                        <option value="">Seleccionar KAM</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                      </select>
                      <button className="zoho-small-btn primary" type="button" onClick={assignManual}>Asignar</button>
                    </div>
                  </Field>
                )}
                <Field label="Observación"><textarea className="zoho-input" rows={3} value={companyForm.observacion} onChange={(e) => setCompanyForm({ ...companyForm, observacion: e.target.value })} /></Field>
                <div className="zoho-form-actions">
                  <button className="zoho-btn zoho-btn-primary" onClick={saveCompany}>{selected ? "Guardar cambios" : "Crear empresa"}</button>
                  {selected && <button className="zoho-btn" onClick={() => { setSelected(null); setCompanyForm(emptyCompany); setRecommendations([]); setActivities([]); setContacts([]); setDraftContacts([]); setContactForm(emptyContact); }}>Limpiar</button>}
                  {selected && canAdmin && <button className="zoho-btn zoho-btn-danger" type="button" onClick={() => deleteCompany(selected)}>Eliminar empresa</button>}
                </div>
              </div>
            )}
          </aside>

          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar">
              <span>{loading ? "Cargando..." : `Empresas ${filteredCompanies.length}`}</span>
              <span className="zoho-help-text">Filtrado por KAM, estado, rubro, región, prioridad y segmento</span>
            </div>
            <div className="zoho-table-scroll-x">
              <table className="zoho-table kam-wide-table">
                <thead>
                  <tr>
                    <th>RUT</th><th>Razón Social</th><th>Mandante origen</th><th>Campaña</th><th>Nro Empleados</th><th>Monto Dev.</th><th>Rubro</th><th>Región</th><th>Contactos</th><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Tel. contacto</th><th>Tel. central</th><th>LinkedIn</th><th>Estado</th><th>Próxima gestión</th><th>Prob.</th><th>Prioridad</th><th>Score</th><th>KAM</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((row) => (
                    <tr key={row.id}>
                      <td>{row.rut}</td>
                      <td className="zoho-link-cell" onClick={() => editCompany(row)}>{row.razon_social}</td>
                      <td>{row.source_mandante_name || "Finanfix Solutions SPA"}</td>
                      <td>{row.campaign_nombre || "—"}</td>
                      <td>{row.nro_empleados || "—"}</td>
                      <td>{money(row.monto_devolucion)}</td>
                      <td>{row.rubro || "—"}</td>
                      <td>{row.region || "—"}</td>
                      <td>{row.contactos_count ?? 0}</td>
                      <td>{row.nombre_contacto || "—"}</td>
                      <td>{row.cargo_contacto || "—"}</td>
                      <td>{row.correo || "—"}</td>
                      <td>{row.telefono || "—"}</td>
                      <td>{row.telefono_central || "—"}</td>
                      <td>{row.linkedin_url ? <a href={row.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a> : "—"}</td>
                      <td><span className={estadoClass(row.estado)}>{row.estado || "—"}</span></td>
                      <td>{row.proxima_gestion ? String(row.proxima_gestion).slice(0, 10) : "—"}</td>
                      <td>{row.probabilidad_cierre ?? "—"}</td>
                      <td><span className={`priority-chip priority-${String(row.prioridad || "").toLowerCase()}`}>{row.prioridad || "—"}</span></td>
                      <td>{row.score_empresa ?? 0}</td>
                      <td>{row.kam_asignado_nombre || "Sin asignar"}</td>
                      <td>
                        <div className="zoho-actions-row compact-actions">
                          <button className="zoho-small-btn" onClick={() => editCompany(row)}>Editar</button>
                          {canAdmin && <button className="zoho-small-btn" onClick={() => recommend(row)}>Recomendar</button>}
                          {canAdmin && <button className="zoho-small-btn danger" onClick={() => deleteCompany(row)}>Eliminar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredCompanies.length && <tr><td colSpan={22}>Sin empresas KAM cargadas.</td></tr>}
                </tbody>
              </table>
            </div>

            {selected && (<>

              <div className="zoho-card kam-recommend-box">
                <h3>Contactos y LinkedIn de {selected.razon_social}</h3>
                <p className="zoho-help-text">Agrega más de un contacto por empresa, con teléfono directo, correo y LinkedIn. Puedes marcar un contacto como principal para actualizar la ficha comercial.</p>
                <div className="zoho-form-grid kam-filter-grid">
                  <Field label="Nombre contacto"><input className="zoho-input" value={contactForm.nombre} onChange={(e) => setContactForm({ ...contactForm, nombre: e.target.value })} /></Field>
                  <Field label="Cargo"><input className="zoho-input" value={contactForm.cargo} onChange={(e) => setContactForm({ ...contactForm, cargo: e.target.value })} /></Field>
                  <Field label="Correo"><input className="zoho-input" value={contactForm.correo} onChange={(e) => setContactForm({ ...contactForm, correo: e.target.value })} /></Field>
                  <Field label="Nro telefónico contacto"><input className="zoho-input" value={contactForm.telefono_contacto} onChange={(e) => setContactForm({ ...contactForm, telefono_contacto: e.target.value })} /></Field>
                  <Field label="LinkedIn contacto"><input className="zoho-input" placeholder="https://www.linkedin.com/in/..." value={contactForm.linkedin_url} onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })} /></Field>
                  <Field label="Observación"><input className="zoho-input" value={contactForm.observacion} onChange={(e) => setContactForm({ ...contactForm, observacion: e.target.value })} /></Field>
                  <label className="zoho-form-field"><span>Principal</span><label className="kam-checkbox-line"><input type="checkbox" checked={Boolean(contactForm.es_principal)} onChange={(e) => setContactForm({ ...contactForm, es_principal: e.target.checked })} /> Usar como contacto principal</label></label>
                  <div className="zoho-form-field"><span>&nbsp;</span><div className="zoho-actions-row"><button className="zoho-btn zoho-btn-primary" type="button" onClick={saveContact}>{editingContactId ? "Actualizar contacto" : "Agregar contacto"}</button>{editingContactId && <button className="zoho-btn" type="button" onClick={() => { setEditingContactId(null); setContactForm(emptyContact); }}>Cancelar</button>}</div></div>
                </div>
                <div className="zoho-table-scroll-x">
                  <table className="zoho-table">
                    <thead><tr><th>Principal</th><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Teléfono contacto</th><th>LinkedIn</th><th>Observación</th><th>Acción</th></tr></thead>
                    <tbody>
                      {contacts.map((c) => <tr key={c.id}><td>{c.es_principal ? "Sí" : "No"}</td><td>{c.nombre}</td><td>{c.cargo || "—"}</td><td>{c.correo || "—"}</td><td>{c.telefono_contacto || "—"}</td><td>{c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a> : "—"}</td><td>{c.observacion || "—"}</td><td><div className="zoho-actions-row compact-actions"><button className="zoho-small-btn" onClick={() => editContact(c)}>Editar</button><button className="zoho-small-btn danger" onClick={() => deleteContact(c)}>Eliminar</button></div></td></tr>)}
                      {!contacts.length && <tr><td colSpan={8}>Sin contactos adicionales registrados.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="zoho-card kam-recommend-box">
                <h3>Bitácora comercial de {selected.razon_social}</h3>
                <p className="zoho-help-text">Registra llamadas, correos, reuniones, próximas acciones y cambios de estado para no perder trazabilidad.</p>
                <div className="zoho-form-grid kam-filter-grid">
                  <Field label="Tipo gestión">
                    <select className="zoho-input" value={activityForm.tipo_gestion} onChange={(e) => setActivityForm({ ...activityForm, tipo_gestion: e.target.value })}>
                      <option>Llamada</option><option>Correo</option><option>WhatsApp</option><option>Reunión</option><option>Propuesta</option><option>Seguimiento</option><option>Reasignación</option>
                    </select>
                  </Field>
                  <Field label="Estado venta"><select className="zoho-input" value={activityForm.estado_venta} onChange={(e) => setActivityForm({ ...activityForm, estado_venta: e.target.value })}>{ESTADOS_VENTA.filter((x) => x !== "Sin asignar").map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Resultado"><input className="zoho-input" value={activityForm.resultado} onChange={(e) => setActivityForm({ ...activityForm, resultado: e.target.value })} placeholder="Contactado, sin respuesta, interesado..." /></Field>
                  <Field label="Próxima acción"><input className="zoho-input" value={activityForm.proxima_accion} onChange={(e) => setActivityForm({ ...activityForm, proxima_accion: e.target.value })} /></Field>
                  <Field label="Próxima gestión"><input className="zoho-input" type="date" value={activityForm.proxima_gestion} onChange={(e) => setActivityForm({ ...activityForm, proxima_gestion: e.target.value })} /></Field>
                  <Field label="Probabilidad %"><input className="zoho-input" type="number" min={0} max={100} value={activityForm.probabilidad_cierre} onChange={(e) => setActivityForm({ ...activityForm, probabilidad_cierre: e.target.value })} /></Field>
                  <Field label="Observación"><textarea className="zoho-input" rows={2} value={activityForm.observacion} onChange={(e) => setActivityForm({ ...activityForm, observacion: e.target.value })} /></Field>
                  <div className="zoho-form-field"><span>&nbsp;</span><button className="zoho-btn zoho-btn-primary" type="button" onClick={saveActivity}>Registrar gestión</button></div>
                </div>
                <div className="zoho-table-scroll-x">
                  <table className="zoho-table">
                    <thead><tr><th>Fecha</th><th>KAM</th><th>Tipo</th><th>Estado</th><th>Resultado</th><th>Próxima acción</th><th>Próxima gestión</th><th>Prob.</th><th>Observación</th></tr></thead>
                    <tbody>
                      {activities.map((a) => <tr key={a.id}><td>{a.created_at ? String(a.created_at).slice(0, 10) : "—"}</td><td>{a.kam_nombre || "—"}</td><td>{a.tipo_gestion}</td><td>{a.estado_venta || "—"}</td><td>{a.resultado || "—"}</td><td>{a.proxima_accion || "—"}</td><td>{a.proxima_gestion ? String(a.proxima_gestion).slice(0, 10) : "—"}</td><td>{a.probabilidad_cierre ?? "—"}</td><td>{a.observacion || "—"}</td></tr>)}
                      {!activities.length && <tr><td colSpan={9}>Sin gestiones registradas para esta empresa.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>)}

            {recommendations.length > 0 && selected && (
              <div className="zoho-card kam-recommend-box">
                <h3>Recomendación para {selected.razon_social}</h3>
                <p>El sistema compara rubro, región, tipo de oportunidad, tamaño, monto potencial, carga actual y ranking comercial.</p>
                <table className="zoho-table">
                  <thead><tr><th>KAM recomendado</th><th>Nivel</th><th>Ranking</th><th>Carga</th><th>Score match</th><th>Motivo</th><th>Acción</th></tr></thead>
                  <tbody>
                    {recommendations.slice(0, 5).map((profile) => (
                      <tr key={profile.user_id}>
                        <td>{profile.full_name || profile.email}</td>
                        <td>{profile.nivel_experiencia}</td>
                        <td>{profile.ranking_kam}</td>
                        <td>{profile.carga_actual || 0}/{profile.capacidad_maxima}</td>
                        <td><strong>{profile.score_match}</strong></td>
                        <td>{(profile.motivos || []).join(" · ") || "Compatibilidad general"}</td>
                        <td><button className="zoho-small-btn primary" onClick={() => assign(selected, profile)}>Asignar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "kanban" && (
        <section className="zoho-dashboard-stack">
          <div className="zoho-table-toolbar">
            <span>Tablero Kanban comercial</span>
            <span className="zoho-help-text">Arrastra una tarjeta a otra columna para cambiar automáticamente el estado de venta. El cambio queda registrado en la bitácora.</span>
          </div>
          <div className="kam-kanban-board">
            {ESTADOS_VENTA.filter((estado) => estado !== "Sin asignar").map((estado) => {
              const items = filteredCompanies.filter((row) => String(row.estado || "") === estado).slice(0, 50);
              const isDropTarget = Boolean(draggingCompanyId);
              return (
                <div
                  className={`kam-kanban-column ${isDropTarget ? "kam-kanban-column-droppable" : ""}`}
                  key={estado}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                  onDrop={(event) => onKanbanDrop(event, estado)}
                >
                  <h3>{estado} <span>{items.length}</span></h3>
                  {items.map((row) => (
                    <button
                      type="button"
                      className={`kam-kanban-card ${draggingCompanyId === row.id ? "kam-kanban-card-dragging" : ""}`}
                      key={row.id}
                      draggable={kanbanUpdatingId !== row.id}
                      onDragStart={(event) => onKanbanDragStart(event, row)}
                      onDragEnd={() => setDraggingCompanyId(null)}
                      onClick={() => { setTab("companies"); editCompany(row); }}
                      disabled={kanbanUpdatingId === row.id}
                      title="Arrastra esta tarjeta a otra columna para cambiar su estado"
                    >
                      <strong>{row.razon_social}</strong>
                      <span>{row.kam_asignado_nombre || "Sin asignar"}</span>
                      <span>{money(row.monto_devolucion)} · {row.nro_empleados || "—"} trab.</span>
                      <span>{row.rubro || "Sin rubro"} · {row.region || "Sin región"}</span>
                      <span className={isOverdue(row.proxima_gestion) ? "kam-alert-text" : ""}>Próxima: {row.proxima_gestion ? String(row.proxima_gestion).slice(0, 10) : "sin fecha"}</span>
                      {kanbanUpdatingId === row.id && <span className="kam-saving-text">Actualizando estado...</span>}
                    </button>
                  ))}
                  {!items.length && <p className="zoho-help-text">Suelta aquí una tarjeta para cambiarla a este estado.</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "tracking" && (
        <section className="zoho-dashboard-stack">
          <div className="zoho-kpi-grid">
            <div className="zoho-card"><strong>{dashboard.total}</strong><span>Empresas filtradas</span></div>
            <div className="zoho-card"><strong>{dashboard.enGestion}</strong><span>En gestión</span></div>
            <div className="zoho-card"><strong>{dashboard.ganadas}</strong><span>Ganadas</span></div>
            <div className="zoho-card"><strong>{dashboard.perdidas}</strong><span>Perdidas</span></div>
            <div className="zoho-card"><strong>{dashboard.vencidas}</strong><span>Gestiones vencidas</span></div>
            <div className="zoho-card"><strong>{dashboard.sinContacto}</strong><span>Sin primer contacto</span></div>
            <div className="zoho-card"><strong>{Number(dashboard.probPromedio || 0).toFixed(0)}%</strong><span>Probabilidad promedio</span></div>
            <div className="zoho-card"><strong>{money(dashboard.montoGanado)}</strong><span>Monto ganado</span></div>
          </div>

          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar"><span>Embudo de ventas por estado</span><span className="zoho-help-text">Muestra cantidad de empresas y monto potencial según los filtros activos.</span></div>
            <div className="zoho-table-scroll-x">
              <table className="zoho-table">
                <thead><tr><th>Estado</th><th>Empresas</th><th>Monto potencial</th></tr></thead>
                <tbody>
                  {dashboard.byEstado.map((row) => <tr key={row.estado}><td>{row.estado}</td><td>{row.total}</td><td>{money(row.monto)}</td></tr>)}
                  {!dashboard.byEstado.length && <tr><td colSpan={3}>Sin empresas para los filtros seleccionados.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar"><span>Seguimiento y medición por KAM</span><span className="zoho-help-text">Control comercial por vendedor: carga, avance, ganadas, perdidas, vencidas y conversión.</span></div>
            <div className="zoho-table-scroll-x">
              <table className="zoho-table kam-wide-table">
                <thead><tr><th>KAM</th><th>Asignadas</th><th>En gestión</th><th>Ganadas</th><th>Perdidas</th><th>Gest. vencidas</th><th>Sin contacto</th><th>Prob. promedio</th><th>Conversión</th><th>Monto potencial</th><th>Monto ganado</th></tr></thead>
                <tbody>
                  {dashboard.byKam.map((row) => (
                    <tr key={row.kam}>
                      <td>{row.kam}</td>
                      <td>{row.total}</td>
                      <td>{row.activas}</td>
                      <td>{row.ganadas}</td>
                      <td>{row.perdidas}</td>
                      <td>{row.vencidas}</td>
                      <td>{row.sin_contacto}</td>
                      <td>{Number(row.probabilidad || 0).toFixed(0)}%</td>
                      <td>{Number(row.conversion || 0).toFixed(0)}%</td>
                      <td>{money(row.monto_potencial)}</td>
                      <td>{money(row.monto_ganado)}</td>
                    </tr>
                  ))}
                  {!dashboard.byKam.length && <tr><td colSpan={11}>Sin métricas disponibles.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar"><span>Empresas críticas para acción</span><span className="zoho-help-text">Empresas vencidas, sin contacto o marcadas para reasignar.</span></div>
            <div className="zoho-table-scroll-x">
              <table className="zoho-table kam-wide-table">
                <thead><tr><th>Empresa</th><th>KAM</th><th>Estado</th><th>Prioridad</th><th>Monto</th><th>Próxima gestión</th><th>Alerta</th><th>Acción</th></tr></thead>
                <tbody>
                  {filteredCompanies.filter((row) => isOverdue(row.proxima_gestion) || (!row.fecha_ultimo_contacto && row.kam_asignado_id) || row.estado === "Reasignar").slice(0, 30).map((row) => (
                    <tr key={row.id}>
                      <td>{row.razon_social}</td>
                      <td>{row.kam_asignado_nombre || "Sin asignar"}</td>
                      <td>{row.estado || "—"}</td>
                      <td><span className={prioridadClass(row.prioridad)}>{row.prioridad || "—"}</span></td>
                      <td>{money(row.monto_devolucion)}</td>
                      <td>{row.proxima_gestion ? String(row.proxima_gestion).slice(0, 10) : "—"}</td>
                      <td>{row.estado === "Reasignar" ? "Requiere reasignación" : isOverdue(row.proxima_gestion) ? "Gestión vencida" : "Sin primer contacto"}</td>
                      <td><button className="zoho-small-btn" onClick={() => { setTab("companies"); editCompany(row); }}>Ver</button></td>
                    </tr>
                  ))}
                  {!filteredCompanies.some((row) => isOverdue(row.proxima_gestion) || (!row.fecha_ultimo_contacto && row.kam_asignado_id) || row.estado === "Reasignar") && <tr><td colSpan={8}>No hay alertas comerciales para los filtros actuales.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}


      {tab === "agenda" && (
        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar"><span>Agenda comercial y alertas</span><span className="zoho-help-text">Gestiones vencidas, de hoy, mañana y empresas sin primer contacto.</span></div>
          <div className="zoho-table-scroll-x">
            <table className="zoho-table kam-wide-table">
              <thead><tr><th>Alerta</th><th>Empresa</th><th>RUT</th><th>KAM</th><th>Estado</th><th>Prioridad</th><th>Monto</th><th>Próxima gestión</th><th>Último contacto</th><th>Acción</th></tr></thead>
              <tbody>
                {agenda.map((row) => <tr key={row.id}>
                  <td><strong>{row.alerta || "Próxima"}</strong></td><td>{row.razon_social}</td><td>{row.rut}</td><td>{row.kam || "Sin asignar"}</td><td>{row.estado || "—"}</td><td>{row.prioridad || "—"}</td><td>{money(row.monto_devolucion)}</td><td>{row.proxima_gestion ? String(row.proxima_gestion).slice(0,10) : "—"}</td><td>{row.fecha_ultimo_contacto ? String(row.fecha_ultimo_contacto).slice(0,10) : "—"}</td><td><button className="zoho-small-btn" onClick={() => { const company = companies.find((c) => c.id === row.id); if (company) { setTab("companies"); editCompany(company); } }}>Abrir</button></td>
                </tr>)}
                {!agenda.length && <tr><td colSpan={10}>Sin agenda comercial disponible.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "campaigns" && canAdmin && (
        <div className="mandantes-layout">
          <aside className="zoho-filter-panel">
            <h2>Campañas e importación Excel</h2>
            <div className="zoho-form-grid single-column-form">
              <Field label="Nombre campaña"><input className="zoho-input" value={campaignForm.nombre} onChange={(e) => setCampaignForm({ ...campaignForm, nombre: e.target.value })} /></Field>
              <Field label="Descripción"><textarea className="zoho-input" rows={3} value={campaignForm.descripcion} onChange={(e) => setCampaignForm({ ...campaignForm, descripcion: e.target.value })} /></Field>
              <Field label="Estado"><select className="zoho-input" value={campaignForm.estado} onChange={(e) => setCampaignForm({ ...campaignForm, estado: e.target.value })}><option>Activa</option><option>Pausada</option><option>Cerrada</option></select></Field>
              <Field label="Fecha inicio"><input className="zoho-input" type="date" value={campaignForm.fecha_inicio} onChange={(e) => setCampaignForm({ ...campaignForm, fecha_inicio: e.target.value })} /></Field>
              <Field label="Fecha fin"><input className="zoho-input" type="date" value={campaignForm.fecha_fin} onChange={(e) => setCampaignForm({ ...campaignForm, fecha_fin: e.target.value })} /></Field>
              <Field label="Objetivo monto"><input className="zoho-input" type="number" value={campaignForm.objetivo_monto} onChange={(e) => setCampaignForm({ ...campaignForm, objetivo_monto: e.target.value })} /></Field>
              <button className="zoho-btn zoho-btn-primary" onClick={saveCampaign}>Guardar campaña</button>
              <hr />
              <Field label="Campaña para importar"><select className="zoho-input" value={importCampaignId} onChange={(e) => setImportCampaignId(e.target.value)}><option value="">Sin campaña</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
              <Field label="Importar Excel"><input className="zoho-input" type="file" accept=".xlsx,.xls" onChange={importExcel} /></Field>
              <button className="zoho-btn" onClick={exportCompanies}>Exportar empresas filtradas</button>
              <p className="zoho-help-text">Columnas aceptadas: RUT, Razón Social, Nro Empleados, Monto Devolución, Rubro, Región, Contacto, Cargo, Correo, Teléfono, Teléfono central y LinkedIn.</p>
            </div>
          </aside>
          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar"><span>Campañas comerciales {campaigns.length}</span></div>
            <table className="zoho-table kam-wide-table"><thead><tr><th>Campaña</th><th>Estado</th><th>Empresas</th><th>Contactadas</th><th>Interesadas</th><th>Propuestas</th><th>Ganadas</th><th>Perdidas</th><th>Monto potencial</th><th>Monto ganado</th></tr></thead><tbody>{campaigns.map((c) => <tr key={c.id}><td>{c.nombre}</td><td>{c.estado || "—"}</td><td>{c.empresas || 0}</td><td>{c.contactadas || 0}</td><td>{c.interesadas || 0}</td><td>{c.propuestas || 0}</td><td>{c.ganadas || 0}</td><td>{c.perdidas || 0}</td><td>{money(c.monto_potencial)}</td><td>{money(c.monto_ganado)}</td></tr>)}{!campaigns.length && <tr><td colSpan={10}>Sin campañas creadas.</td></tr>}</tbody></table>
          </section>
        </div>
      )}

      {tab === "profiles" && (
        <div className="mandantes-layout">
          <aside className="zoho-filter-panel">
            <h2>Perfil de experiencia KAM</h2>
            {canConfigure ? (
              <div className="zoho-form-grid single-column-form">
                <Field label="KAM vendedor">
                  <select className="zoho-input" value={profileForm.user_id} onChange={(e) => setProfileForm({ ...profileForm, user_id: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </Field>
                <Field label="Nivel experiencia"><select className="zoho-input" value={profileForm.nivel_experiencia} onChange={(e) => setProfileForm({ ...profileForm, nivel_experiencia: e.target.value })}><option>Junior</option><option>Semi senior</option><option>Senior</option><option>Experto</option></select></Field>
                <Rating label="Licitaciones" value={profileForm.experiencia_licitaciones} onChange={(v) => setProfileForm({ ...profileForm, experiencia_licitaciones: v })} />
                <Rating label="Ventas" value={profileForm.experiencia_ventas} onChange={(v) => setProfileForm({ ...profileForm, experiencia_ventas: v })} />
                <Rating label="Recuperaciones" value={profileForm.experiencia_recuperaciones} onChange={(v) => setProfileForm({ ...profileForm, experiencia_recuperaciones: v })} />
                <Rating label="Empresas grandes" value={profileForm.experiencia_empresas_grandes} onChange={(v) => setProfileForm({ ...profileForm, experiencia_empresas_grandes: v })} />
                <Rating label="Empresas pequeñas" value={profileForm.experiencia_empresas_pequenas} onChange={(v) => setProfileForm({ ...profileForm, experiencia_empresas_pequenas: v })} />
                <Field label="Rubros fuertes"><input className="zoho-input" placeholder="Minería, Construcción, Servicios" value={profileForm.rubros_experiencia} onChange={(e) => setProfileForm({ ...profileForm, rubros_experiencia: e.target.value })} /></Field>
                <Field label="Regiones fuertes"><input className="zoho-input" placeholder="RM, Antofagasta, Biobío" value={profileForm.regiones_experiencia} onChange={(e) => setProfileForm({ ...profileForm, regiones_experiencia: e.target.value })} /></Field>
                <Field label="Capacidad máxima"><input className="zoho-input" type="number" value={profileForm.capacidad_maxima} onChange={(e) => setProfileForm({ ...profileForm, capacidad_maxima: e.target.value })} /></Field>
                <Field label="Tasa cierre %"><input className="zoho-input" type="number" value={profileForm.tasa_cierre} onChange={(e) => setProfileForm({ ...profileForm, tasa_cierre: e.target.value })} /></Field>
                <Field label="Monto cerrado histórico"><input className="zoho-input" type="number" value={profileForm.monto_cerrado_historico} onChange={(e) => setProfileForm({ ...profileForm, monto_cerrado_historico: e.target.value })} /></Field>
                <button className="zoho-btn zoho-btn-primary" onClick={saveProfile}>Guardar perfil KAM</button>
              </div>
            ) : <p className="zoho-help-text">Solo admin o KAM administrador pueden modificar perfiles.</p>}
          </aside>

          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar"><span>Ranking KAM {profiles.length}</span></div>
            <table className="zoho-table">
              <thead><tr><th>KAM</th><th>Nivel</th><th>Ranking</th><th>Carga</th><th>Licit.</th><th>Ventas</th><th>Recup.</th><th>Grandes</th><th>Pequeñas</th><th>Rubros</th><th>Regiones</th><th>Acción</th></tr></thead>
              <tbody>
                {profiles.map((p) => <tr key={p.user_id}><td>{p.full_name || p.email}</td><td>{p.nivel_experiencia}</td><td><strong>{p.ranking_kam}</strong></td><td>{p.carga_actual || 0}/{p.capacidad_maxima}</td><td>{p.experiencia_licitaciones}</td><td>{p.experiencia_ventas}</td><td>{p.experiencia_recuperaciones}</td><td>{p.experiencia_empresas_grandes}</td><td>{p.experiencia_empresas_pequenas}</td><td>{csv(p.rubros_experiencia)}</td><td>{csv(p.regiones_experiencia)}</td><td>{canConfigure && <button className="zoho-small-btn" onClick={() => editProfile(p)}>Editar</button>}</td></tr>)}
                {!profiles.length && <tr><td colSpan={12}>Sin perfiles KAM configurados.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === "rules" && (
        <div className="mandantes-layout">
          <aside className="zoho-filter-panel">
            <h2>Crear regla</h2>
            {canConfigure ? <div className="zoho-form-grid single-column-form">
              <Field label="Nombre regla"><input className="zoho-input" value={ruleForm.nombre_regla} onChange={(e) => setRuleForm({ ...ruleForm, nombre_regla: e.target.value })} /></Field>
              <Field label="Criterio"><select className="zoho-input" value={ruleForm.criterio} onChange={(e) => setRuleForm({ ...ruleForm, criterio: e.target.value })}><option value="monto_devolucion">Monto devolución</option><option value="nro_empleados">Nro empleados</option><option value="rubro">Rubro</option><option value="region">Región</option><option value="tipo_oportunidad">Tipo oportunidad</option><option value="carga_actual">Carga KAM</option></select></Field>
              <Field label="Operador"><select className="zoho-input" value={ruleForm.operador} onChange={(e) => setRuleForm({ ...ruleForm, operador: e.target.value })}><option>&gt;</option><option>&gt;=</option><option>=</option><option>contiene</option><option>&lt;</option></select></Field>
              <Field label="Valor"><input className="zoho-input" value={ruleForm.valor} onChange={(e) => setRuleForm({ ...ruleForm, valor: e.target.value })} /></Field>
              <Field label="Peso"><input className="zoho-input" type="number" value={ruleForm.peso} onChange={(e) => setRuleForm({ ...ruleForm, peso: e.target.value })} /></Field>
              <Field label="Acción"><input className="zoho-input" value={ruleForm.accion} onChange={(e) => setRuleForm({ ...ruleForm, accion: e.target.value })} /></Field>
              <button className="zoho-btn zoho-btn-primary" onClick={saveRule}>Agregar regla</button>
            </div> : <p className="zoho-help-text">Solo admin o KAM administrador pueden crear reglas.</p>}
          </aside>
          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar"><span>Reglas comerciales {rules.length}</span></div>
            <table className="zoho-table"><thead><tr><th>Regla</th><th>Criterio</th><th>Operador</th><th>Valor</th><th>Peso</th><th>Acción</th><th>Estado</th></tr></thead><tbody>{rules.map((r) => <tr key={r.id}><td>{r.nombre_regla}</td><td>{r.criterio}</td><td>{r.operador}</td><td>{r.valor || "—"}</td><td>{r.peso}</td><td>{r.accion}</td><td>{r.activa ? "Activa" : "Inactiva"}</td></tr>)}{!rules.length && <tr><td colSpan={7}>Sin reglas configuradas. Puedes agregar reglas como monto mayor a $20.000.000, rubro minería o tipo licitación.</td></tr>}</tbody></table>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <label className="zoho-form-field"><span>{label}</span>{children}</label>;
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <Field label={`${label} (0 a 5)`}><input className="zoho-input" type="number" min={0} max={5} value={value} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
}
