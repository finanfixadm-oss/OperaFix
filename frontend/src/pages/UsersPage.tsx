import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson } from "../api";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "interno" | "kam" | "cliente" | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  active: boolean;
  created_at?: string;
};

type Mandante = { id: string; name: string };

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  role: "cliente",
  mandante_id: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [mandantes, setMandantes] = useState<Mandante[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [error, setError] = useState("");

  const session = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [userRows, mandanteRows] = await Promise.all([
        fetchJson<UserRow[]>("/users"),
        fetchJson<Mandante[]>("/mandantes"),
      ]);
      setUsers(userRows);
      setMandantes(mandanteRows);
    } catch (err: any) {
      setError(err.message || "No se pudieron cargar los usuarios. Inicia sesión como admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const selectedMandante = mandantes.find((m) => m.id === form.mandante_id);
      await postJson("/users", {
        ...form,
        mandante_name: selectedMandante?.name || null,
        mandante_id: form.role === "cliente" ? form.mandante_id || null : null,
      });
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(err.message || "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function disableUser(user: UserRow) {
    if (!confirm(`¿Desactivar usuario ${user.email}?`)) return;
    setError("");
    try {
      await fetchJson(`/users/${user.id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      setError(err.message || "No se pudo desactivar el usuario.");
    }
  }


  async function createDefaultUsers() {
    const password = prompt(
      "Contraseña temporal para los usuarios base:",
      "OperaFix2026!"
    );
    if (!password) return;
    if (!confirm("Esto creará o actualizará los usuarios base con la contraseña indicada. ¿Continuar?")) return;

    setSeeding(true);
    setSeedMessage("");
    setError("");
    try {
      const result = await postJson<{ message: string; default_password: string }>("/users/seed-defaults", { password });
      setSeedMessage(result.message || "Usuarios base creados/actualizados correctamente.");
      await load();
    } catch (err: any) {
      setError(err.message || "No se pudieron crear los usuarios base.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="zoho-module-page">
      <div className="zoho-page-header">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Control de usuarios</h1>
          <p>Administra usuarios internos y clientes. Los usuarios cliente quedan asociados a un mandante y solo ven sus gestiones en el portal.</p>
        </div>
        <div className="users-header-actions"><div className="zoho-chip">Sesión: {session?.full_name || session?.email || "sin sesión"}</div><button className="zoho-btn primary" type="button" onClick={createDefaultUsers} disabled={seeding}>{seeding ? "Creando usuarios..." : "Crear usuarios base"}</button></div>
      </div>

      {error && <div className="zoho-alert danger">{error}</div>}
      {seedMessage && <div className="zoho-alert success">{seedMessage}</div>}


      <section className="zoho-card users-default-card">
        <h2>Usuarios base solicitados</h2>
        <p>Usa el botón <strong>Crear usuarios base</strong> para dejar listos estos accesos con una contraseña temporal.</p>
        <div className="default-users-grid">
          <div><strong>Clientes</strong><span>mandante@mundoprevisional.cl → Mundo Previsional</span><span>mandante@optmizaco.cl → Optimiza Consulting</span></div>
          <div><strong>KAM</strong><span>smendoza@finanfix.cl</span></div>
          <div><strong>Admin</strong><span>gmendoza@finanfix.cl</span><span>lmendoza@finanfix.cl</span><span>egabriaguez@finanfix.cl</span></div>
        </div>
      </section>

      <section className="zoho-card">
        <h2>Crear usuario</h2>
        <form className="report-form-grid" onSubmit={createUser}>
          <label>Nombre
            <input className="zoho-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </label>
          <label>Email
            <input className="zoho-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>Contraseña
            <input className="zoho-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>Rol
            <select className="zoho-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="interno">Interno</option>
              <option value="kam">KAM</option>
              <option value="cliente">Cliente / Mandante</option>
            </select>
          </label>
          <label>Mandante para portal cliente
            <select className="zoho-select" value={form.mandante_id} onChange={(e) => setForm({ ...form, mandante_id: e.target.value })} disabled={form.role !== "cliente"}>
              <option value="">Seleccionar mandante</option>
              {mandantes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <div className="report-form-actions">
            <button className="zoho-btn primary" disabled={saving}>{saving ? "Guardando..." : "Crear usuario"}</button>
          </div>
        </form>
      </section>

      <section className="zoho-card">
        <h2>Usuarios existentes</h2>
        {loading ? <div className="zoho-empty">Cargando usuarios...</div> : (
          <div className="zoho-table-scroll">
            <table className="zoho-table">
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Mandante</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className="status-pill">{u.role}</span></td>
                    <td>{u.mandante_name || "—"}</td>
                    <td>{u.active ? "Activo" : "Inactivo"}</td>
                    <td><button className="zoho-btn subtle" onClick={() => disableUser(u)} disabled={!u.active}>Desactivar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
