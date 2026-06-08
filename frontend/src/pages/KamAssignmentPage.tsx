import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, putJson } from "../api";
import { getCurrentUser } from "../auth";

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

const emptyCompany = {
  rut: "",
  razon_social: "",
  nro_empleados: "",
  monto_devolucion: "",
  nombre_contacto: "",
  cargo_contacto: "",
  correo: "",
  telefono: "",
  estado: "Sin asignar",
  observacion: "",
  rubro: "",
  region: "",
  tipo_oportunidad: "Recuperaciones",
  origen: "Carga manual",
  canal_origen: "",
  probabilidad_cierre: "",
  proxima_gestion: "",
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
  const [tab, setTab] = useState<"companies" | "profiles" | "rules">("companies");
  const [companies, setCompanies] = useState<KamCompany[]>([]);
  const [profiles, setProfiles] = useState<KamProfile[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KamCompany | null>(null);
  const [companyForm, setCompanyForm] = useState<any>(emptyCompany);
  const [profileForm, setProfileForm] = useState<any>(emptyProfile);
  const [ruleForm, setRuleForm] = useState<any>(emptyRule);
  const [recommendations, setRecommendations] = useState<KamProfile[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [companyRows, profileRows, ruleRows] = await Promise.all([
        fetchJson<KamCompany[]>("/kam/companies"),
        fetchJson<KamProfile[]>("/kam/profiles"),
        fetchJson<RuleRow[]>("/kam/rules"),
      ]);
      setCompanies(companyRows);
      setProfiles(profileRows);
      setRules(ruleRows);
      if (canConfigure) {
        const userRows = await fetchJson<UserRow[]>("/users").catch(() => [] as UserRow[]);
        setUsers(userRows.filter((item) => String(item.role).toLowerCase() === "kam" && item.active !== false));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((row) =>
      [row.rut, row.razon_social, row.rubro, row.region, row.estado, row.prioridad, row.kam_asignado_nombre]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [companies, search]);

  const kpis = useMemo(() => {
    const strategic = companies.filter((x) => x.prioridad === "Estratégica").length;
    const unassigned = companies.filter((x) => !x.kam_asignado_id).length;
    const totalAmount = companies.reduce((sum, x) => sum + Number(x.monto_devolucion || 0), 0);
    return { total: companies.length, strategic, unassigned, totalAmount };
  }, [companies]);

  function editCompany(row: KamCompany) {
    setSelected(row);
    setCompanyForm({
      ...emptyCompany,
      ...row,
      nro_empleados: row.nro_empleados || "",
      monto_devolucion: row.monto_devolucion || "",
      nombre_contacto: row.nombre_contacto || "",
      cargo_contacto: row.cargo_contacto || "",
      telefono: row.telefono || "",
      probabilidad_cierre: row.probabilidad_cierre || "",
      proxima_gestion: row.proxima_gestion ? String(row.proxima_gestion).slice(0, 10) : "",
    });
    setRecommendations([]);
  }

  async function saveCompany() {
    if (!companyForm.rut || !companyForm.razon_social) {
      alert("Debes ingresar RUT y Razón Social.");
      return;
    }
    if (selected) await putJson(`/kam/companies/${selected.id}`, companyForm);
    else await postJson("/kam/companies", companyForm);
    setCompanyForm(emptyCompany);
    setSelected(null);
    await loadAll();
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
  }

  async function saveRule() {
    if (!ruleForm.nombre_regla) {
      alert("Debes ingresar el nombre de la regla.");
      return;
    }
    await postJson("/kam/rules", ruleForm);
    setRuleForm(emptyRule);
    await loadAll();
  }

  return (
    <div className="zoho-module-page kam-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Asignación Inteligente KAM</h1>
          <p>Segmenta empresas por rubro, región, cantidad de trabajadores y monto potencial para asignarlas al KAM correcto.</p>
        </div>
        <div className="zoho-module-actions">
          <button className={tab === "companies" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("companies")}>Empresas</button>
          <button className={tab === "profiles" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("profiles")}>Ranking KAM</button>
          <button className={tab === "rules" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setTab("rules")}>Reglas</button>
        </div>
      </div>

      <div className="zoho-kpi-grid">
        <div className="zoho-card"><strong>{kpis.total}</strong><span>Empresas en cartera</span></div>
        <div className="zoho-card"><strong>{kpis.strategic}</strong><span>Estratégicas</span></div>
        <div className="zoho-card"><strong>{kpis.unassigned}</strong><span>Sin asignar</span></div>
        <div className="zoho-card"><strong>{money(kpis.totalAmount)}</strong><span>Monto potencial</span></div>
      </div>

      {tab === "companies" && (
        <div className="mandantes-layout">
          <aside className="zoho-filter-panel">
            <h2>{selected ? "Editar empresa" : "Nueva empresa"}</h2>
            {!canAdmin && <p className="zoho-help-text">Como KAM vendedor puedes revisar y actualizar tu cartera, pero la asignación la realiza el KAM administrador.</p>}
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
                <Field label="Nro Telefónico"><input className="zoho-input" value={companyForm.telefono} onChange={(e) => setCompanyForm({ ...companyForm, telefono: e.target.value })} /></Field>
                <Field label="Tipo oportunidad">
                  <select className="zoho-input" value={companyForm.tipo_oportunidad} onChange={(e) => setCompanyForm({ ...companyForm, tipo_oportunidad: e.target.value })}>
                    <option>Recuperaciones</option><option>Ventas propias</option><option>Licitaciones</option><option>Referido</option><option>Campaña</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select className="zoho-input" value={companyForm.estado} onChange={(e) => setCompanyForm({ ...companyForm, estado: e.target.value })}>
                    <option>Sin asignar</option><option>Asignada</option><option>En prospección</option><option>Contactada</option><option>Interesada</option><option>Propuesta enviada</option><option>En negociación</option><option>Ganada</option><option>Perdida</option><option>Congelada</option><option>Reasignar</option>
                  </select>
                </Field>
                <Field label="Observación"><textarea className="zoho-input" rows={3} value={companyForm.observacion} onChange={(e) => setCompanyForm({ ...companyForm, observacion: e.target.value })} /></Field>
                <div className="zoho-form-actions">
                  <button className="zoho-btn zoho-btn-primary" onClick={saveCompany}>{selected ? "Guardar cambios" : "Crear empresa"}</button>
                  {selected && <button className="zoho-btn" onClick={() => { setSelected(null); setCompanyForm(emptyCompany); setRecommendations([]); }}>Limpiar</button>}
                </div>
              </div>
            )}
          </aside>

          <section className="zoho-table-wrap">
            <div className="zoho-table-toolbar">
              <span>{loading ? "Cargando..." : `Empresas ${filteredCompanies.length}`}</span>
              <input className="zoho-input compact-search" placeholder="Buscar por RUT, RS, rubro, región o KAM" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="zoho-table-scroll-x">
              <table className="zoho-table kam-wide-table">
                <thead>
                  <tr>
                    <th>RUT</th><th>Razón Social</th><th>Nro Empleados</th><th>Monto Dev.</th><th>Rubro</th><th>Región</th><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Nro Telefónico</th><th>Estado</th><th>Prioridad</th><th>Score</th><th>KAM</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((row) => (
                    <tr key={row.id}>
                      <td>{row.rut}</td>
                      <td className="zoho-link-cell" onClick={() => editCompany(row)}>{row.razon_social}</td>
                      <td>{row.nro_empleados || "—"}</td>
                      <td>{money(row.monto_devolucion)}</td>
                      <td>{row.rubro || "—"}</td>
                      <td>{row.region || "—"}</td>
                      <td>{row.nombre_contacto || "—"}</td>
                      <td>{row.cargo_contacto || "—"}</td>
                      <td>{row.correo || "—"}</td>
                      <td>{row.telefono || "—"}</td>
                      <td>{row.estado || "—"}</td>
                      <td><span className={`priority-chip priority-${String(row.prioridad || "").toLowerCase()}`}>{row.prioridad || "—"}</span></td>
                      <td>{row.score_empresa ?? 0}</td>
                      <td>{row.kam_asignado_nombre || "Sin asignar"}</td>
                      <td>
                        <div className="zoho-actions-row compact-actions">
                          <button className="zoho-small-btn" onClick={() => editCompany(row)}>Editar</button>
                          {canAdmin && <button className="zoho-small-btn" onClick={() => recommend(row)}>Recomendar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredCompanies.length && <tr><td colSpan={15}>Sin empresas KAM cargadas.</td></tr>}
                </tbody>
              </table>
            </div>

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
