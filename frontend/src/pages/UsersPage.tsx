import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson } from "../api";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "interno" | "kam" | "cliente" | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandante_ids?: string[];
  assigned_mandante_names?: string[];
  active: boolean;
  created_at?: string;
};

type Mandante = { id: string; name: string };

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  role: "interno",
  assigned_mandante_ids: [] as string[],
};

function roleNeedsMandantes(role: string) {
  return ["interno", "kam", "cliente"].includes(String(role || "").toLowerCase());
}

function mandanteLabel(user: UserRow) {
  const assigned = user.assigned_mandante_names || [];
  if (assigned.length) return assigned.join(", ");
  return user.mandante_name || "—";
}

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

  function toggleMandante(id: string) {
    setForm((prev) => {
      const exists = prev.assigned_mandante_ids.includes(id);
      return {
        ...prev,
        assigned_mandante_ids: exists
          ? prev.assigned_mandante_ids.filter((item) => item !== id)
          : [...prev.assigned_mandante_ids, id],
      };
    });
  }

  function selectAllMandantes() {
    setForm((prev) => ({ ...prev, assigned_mandante_ids: mandantes.map((m) => m.id) }));
  }

  function clearMandantes() {
    setForm((prev) => ({ ...prev, assigned_mandante_ids: [] }));
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (roleNeedsMandantes(form.role) && form.assigned_mandante_ids.length === 0) {
        throw new Error("Debes asignar al menos un mandante para este rol.");
      }

      const firstMandante = mandantes.find((m) => m.id === form.assigned_mandante_ids[0]);
      await postJson("/users", {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        assigned_mandante_ids: form.role === "admin" ? [] : form.assigned_mandante_ids,
        mandante_id: form.role === "admin" ? null : firstMandante?.id || null,
        mandante_name: form.role === "admin" ? null : firstMandante?.name || null,
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
    const password = prompt("Contraseña temporal para los usuarios base:", "OperaFix2026!");
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

  const selectedMandantes = mandantes.filter((m) => form.assigned_mandante_ids.includes(m.id));

  return (
    <div className="zoho-module-page">
      <div className="zoho-page-header">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Control de usuarios</h1>
          <p>
            Crea usuarios internos, KAM y clientes. Los usuarios internos pueden operar como admin,
            pero solo ven los mandantes asignados y no pueden administrar usuarios.
          </p>
        </div>
        <div className="users-header-actions">
          <div className="zoho-chip">Sesión: {session?.full_name || session?.email || "sin sesión"}</div>
          <button className="zoho-btn primary" type="button" onClick={createDefaultUsers} disabled={seeding}>
            {seeding ? "Creando usuarios..." : "Crear usuarios base"}
          </button>
        </div>
      </div>

      {error && <div className="zoho-alert danger">{error}</div>}
      {seedMessage && <div className="zoho-alert success">{seedMessage}</div>}

      <section className="zoho-card users-default-card">
        <h2>Regla de acceso por mandante</h2>
        <p>
          <strong>Admin</strong> ve todo y puede crear usuarios. <strong>Interno/KAM</strong> puede operar registros,
          dashboard, portal, carga e informes, pero solo de los mandantes asignados. <strong>Cliente</strong> solo ve su portal.
        </p>
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
            <select
              className="zoho-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, assigned_mandante_ids: e.target.value === "admin" ? [] : form.assigned_mandante_ids })}
            >
              <option value="admin">Admin</option>
              <option value="interno">Interno</option>
              <option value="kam">KAM</option>
              <option value="cliente">Cliente / Mandante</option>
            </select>
          </label>

          <div className="user-mandantes-picker">
            <div className="user-mandantes-head">
              <div>
                <strong>Mandantes asignados</strong>
                <span>{form.role === "admin" ? "Admin ve todos los mandantes" : `${selectedMandantes.length} seleccionados`}</span>
              </div>
              <div className="user-mandantes-actions">
                <button type="button" className="zoho-btn subtle" onClick={selectAllMandantes} disabled={form.role === "admin"}>Todos</button>
                <button type="button" className="zoho-btn subtle" onClick={clearMandantes} disabled={form.role === "admin"}>Limpiar</button>
              </div>
            </div>
            <div className="user-mandantes-grid">
              {mandantes.map((m) => (
                <label key={m.id} className={form.assigned_mandante_ids.includes(m.id) ? "mandante-check active" : "mandante-check"}>
                  <input
                    type="checkbox"
                    checked={form.assigned_mandante_ids.includes(m.id)}
                    onChange={() => toggleMandante(m.id)}
                    disabled={form.role === "admin"}
                  />
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
            {roleNeedsMandantes(form.role) && selectedMandantes.length === 0 && <small className="field-warning">Este rol requiere al menos un mandante asignado.</small>}
          </div>

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
                <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Mandantes visibles</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className="status-pill">{u.role}</span></td>
                    <td>{u.role === "admin" ? "Todos" : mandanteLabel(u)}</td>
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
