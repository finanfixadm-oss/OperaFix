import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson } from "../api";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "interno" | "kam" | "cliente" | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandantes?: { id: string; name: string }[];
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

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    interno: "Interno",
    kam: "KAM",
    cliente: "Cliente",
  };

  return labels[String(role || "").toLowerCase()] || role;
}

function assignedText(user: UserRow) {
  const assigned = user.assigned_mandantes || [];
  if (String(user.role).toLowerCase() === "admin") return "Todos los mandantes";
  if (assigned.length) return assigned.map((item) => item.name).join(", ");
  if (user.mandante_name) return user.mandante_name;
  return "Sin mandantes asignados";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [mandantes, setMandantes] = useState<Mandante[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isAdmin = String(session?.role || "").toLowerCase() === "admin";

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

  useEffect(() => {
    load();
  }, []);

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
    setForm((prev) => ({
      ...prev,
      assigned_mandante_ids: mandantes.map((item) => item.id),
    }));
  }

  function clearMandantes() {
    setForm((prev) => ({
      ...prev,
      assigned_mandante_ids: [],
    }));
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();

    if (!isAdmin) {
      setError("Solo un administrador puede crear usuarios.");
      return;
    }

    if (form.role !== "admin" && form.assigned_mandante_ids.length === 0) {
      setError("Debes asignar uno o más mandantes para usuarios internos, KAM o clientes.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await postJson("/users", {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        assigned_mandante_ids: form.role === "admin" ? [] : form.assigned_mandante_ids,
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
    if (!isAdmin) {
      setError("Solo un administrador puede desactivar usuarios.");
      return;
    }

    if (!confirm(`¿Desactivar usuario ${user.email}?`)) return;

    setError("");
    try {
      await fetchJson(`/users/${user.id}`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      setError(err.message || "No se pudo desactivar el usuario.");
    }
  }

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Control de usuarios</h1>
          <p>
            Administra usuarios de OperaFix. Los internos y KAM pueden operar el CRM,
            pero solo ven los mandantes asignados. Solo Admin puede crear usuarios.
          </p>
        </div>
      </div>

      {error && <div className="zoho-alert danger">{error}</div>}

      {!isAdmin && (
        <div className="zoho-alert warning">
          Tu rol no permite crear usuarios. Puedes operar el CRM según tus mandantes asignados.
        </div>
      )}

      <div className="users-admin-grid">
        <section className="zoho-card users-create-card">
          <div className="zoho-card-header">
            <div>
              <h2>Crear usuario</h2>
              <p>Asigna uno o más mandantes para limitar la información visible.</p>
            </div>
          </div>

          <form onSubmit={createUser} className="zoho-form-grid users-form-grid">
            <Field label="Nombre completo">
              <input
                className="zoho-input"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </Field>

            <Field label="Correo">
              <input
                className="zoho-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </Field>

            <Field label="Contraseña temporal">
              <input
                className="zoho-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </Field>

            <Field label="Rol">
              <select
                className="zoho-select"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value,
                    assigned_mandante_ids: e.target.value === "admin" ? [] : prev.assigned_mandante_ids,
                  }))
                }
              >
                <option value="admin">Administrador</option>
                <option value="interno">Interno</option>
                <option value="kam">KAM</option>
                <option value="cliente">Cliente</option>
              </select>
            </Field>

            {form.role !== "admin" && (
              <div className="zoho-form-field users-mandantes-field">
                <label>Mandantes asignados</label>
                <div className="users-mandantes-actions">
                  <button type="button" className="zoho-small-btn" onClick={selectAllMandantes}>
                    Seleccionar todos
                  </button>
                  <button type="button" className="zoho-small-btn" onClick={clearMandantes}>
                    Limpiar
                  </button>
                </div>

                <div className="users-mandantes-box">
                  {mandantes.map((mandante) => (
                    <label key={mandante.id} className="users-mandante-check">
                      <input
                        type="checkbox"
                        checked={form.assigned_mandante_ids.includes(mandante.id)}
                        onChange={() => toggleMandante(mandante.id)}
                      />
                      <span>{mandante.name}</span>
                    </label>
                  ))}
                </div>

                <small>
                  Seleccionados: {form.assigned_mandante_ids.length}. El usuario solo verá registros,
                  dashboard, portal, informes y carga asociados a estos mandantes.
                </small>
              </div>
            )}

            <div className="zoho-form-actions users-form-actions">
              <button className="zoho-btn zoho-btn-primary" disabled={saving || !isAdmin}>
                {saving ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </section>

        <section className="zoho-card users-rules-card">
          <h2>Reglas de acceso</h2>
          <div className="users-rule-list">
            <div>
              <strong>Administrador</strong>
              <span>Ve todo y puede crear usuarios.</span>
            </div>
            <div>
              <strong>Interno / KAM</strong>
              <span>Opera el CRM completo, pero solo sobre sus mandantes asignados. No puede crear usuarios.</span>
            </div>
            <div>
              <strong>Cliente</strong>
              <span>Accede al portal cliente e informes de sus mandantes asignados.</span>
            </div>
          </div>
        </section>
      </div>

      <section className="zoho-table-wrap users-table-wrap">
        <div className="zoho-table-toolbar">
          <span>Usuarios {users.length}</span>
          <span className="zoho-table-range">
            {loading ? "Cargando..." : "Mandantes visibles según asignación"}
          </span>
        </div>

        <div className="zoho-table-horizontal-scroll">
          <table className="zoho-table users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Mandantes asignados</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`user-role-pill role-${String(user.role).toLowerCase()}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="users-assigned-cell">{assignedText(user)}</td>
                  <td>{user.active ? "Activo" : "Inactivo"}</td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString("es-CL") : "—"}</td>
                  <td>
                    {isAdmin && user.active && (
                      <button className="zoho-small-btn danger" onClick={() => disableUser(user)}>
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {!users.length && (
                <tr>
                  <td colSpan={7}>Sin usuarios creados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="zoho-form-field">
      <label>{label}</label>
      {children}
    </div>
  );
}
