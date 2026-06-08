import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, putJson } from "../api";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "interno" | "kam_admin" | "kam" | "cliente" | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandantes?: { id: string; name: string }[];
  assigned_mandante_ids?: string[];
  assigned_mandante_names?: string[];
  active: boolean;
  created_at?: string;
};

type Mandante = { id: string; name: string };

type UserForm = {
  full_name: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
  assigned_mandante_ids: string[];
};

const emptyForm: UserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "interno",
  active: true,
  assigned_mandante_ids: [],
};

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    interno: "Interno",
    kam_admin: "KAM administrador",
    kam: "KAM vendedor",
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

function formFromUser(user: UserRow): UserForm {
  const assignedIds =
    user.assigned_mandante_ids ||
    user.assigned_mandantes?.map((item) => item.id) ||
    (user.mandante_id ? [user.mandante_id] : []);

  return {
    full_name: user.full_name || "",
    email: user.email || "",
    password: "",
    role: String(user.role || "interno").toLowerCase(),
    active: user.active !== false,
    assigned_mandante_ids: String(user.role).toLowerCase() === "admin" ? [] : assignedIds,
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [mandantes, setMandantes] = useState<Mandante[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const sessionRole = String(session?.role || "").toLowerCase();
  const isAdmin = sessionRole === "admin";
  const isKamAdmin = sessionRole === "kam_admin";
  const canManageUsers = isAdmin || isKamAdmin;

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
      setError(err.message || "No se pudieron cargar los usuarios. Inicia sesión como administrador o KAM administrador.");
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

  function startEdit(user: UserRow) {
    setEditingUser(user);
    setForm(formFromUser(user));
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();

    if (!canManageUsers) {
      setError("Solo un administrador o KAM administrador puede crear o modificar usuarios.");
      return;
    }

    if (isKamAdmin && form.role !== "kam") {
      setError("El KAM administrador solo puede crear o modificar usuarios KAM vendedor.");
      return;
    }

    if (form.role !== "admin" && form.assigned_mandante_ids.length === 0) {
      setError("Debes asignar uno o más mandantes para usuarios internos, KAM administrador, KAM vendedor o clientes.");
      return;
    }

    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setError("La contraseña temporal es obligatoria al crear un usuario.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: isKamAdmin ? "kam" : form.role,
      active: form.active,
      assigned_mandante_ids: (isKamAdmin ? "kam" : form.role) === "admin" ? [] : form.assigned_mandante_ids,
    };

    try {
      if (editingUser) {
        await putJson(`/users/${editingUser.id}`, payload);
        setSuccess("Usuario actualizado correctamente.");
      } else {
        await postJson("/users", payload);
        setSuccess("Usuario creado correctamente.");
      }

      setEditingUser(null);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function setUserActive(user: UserRow, active: boolean) {
    if (!canManageUsers) {
      setError("Solo un administrador o KAM administrador puede activar o desactivar usuarios.");
      return;
    }

    const action = active ? "activar" : "desactivar";
    if (!confirm(`¿${action} usuario ${user.email}?`)) return;

    setError("");
    setSuccess("");
    try {
      await putJson(`/users/${user.id}`, {
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        active,
        assigned_mandante_ids:
          String(user.role).toLowerCase() === "admin"
            ? []
            : user.assigned_mandante_ids || user.assigned_mandantes?.map((item) => item.id) || [],
      });
      setSuccess(active ? "Usuario activado." : "Usuario desactivado.");
      await load();
    } catch (err: any) {
      setError(err.message || `No se pudo ${action} el usuario.`);
    }
  }

  async function deleteUser(user: UserRow) {
    if (!canManageUsers) {
      setError("Solo un administrador o KAM administrador puede eliminar usuarios.");
      return;
    }

    const currentId = String(session?.id || session?.sub || "");
    if (currentId && currentId === String(user.id)) {
      setError("No puedes eliminar tu propio usuario desde esta pantalla.");
      return;
    }

    if (
      !confirm(
        `¿Eliminar definitivamente el usuario ${user.email}?\n\nEsta acción borrará el usuario y sus mandantes asignados. No elimina registros del CRM.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    try {
      await fetchJson(`/users/${user.id}`, { method: "DELETE" });
      if (editingUser?.id === user.id) cancelEdit();
      setSuccess("Usuario eliminado correctamente.");
      await load();
    } catch (err: any) {
      setError(err.message || "No se pudo eliminar el usuario.");
    }
  }

  const selectedCount = form.assigned_mandante_ids.length;

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Control de usuarios</h1>
          <p>
            Administra usuarios de OperaFix. Los internos, KAM administradores y KAM vendedores pueden operar el CRM,
            pero solo ven los mandantes asignados. Admin administra todo; KAM administrador reparte mandantes/casos a KAM vendedores.
          </p>
        </div>
      </div>

      {error && <div className="zoho-alert danger">{error}</div>}
      {success && <div className="zoho-alert success">{success}</div>}

      {!canManageUsers && (
        <div className="zoho-alert warning">
          Tu rol no permite administrar usuarios. Puedes operar el CRM según tus mandantes asignados.
        </div>
      )}

      {isKamAdmin && (
        <div className="zoho-alert info">
          Estás operando como KAM administrador: solo puedes crear, editar, activar o eliminar KAM vendedores y asignarles mandantes que estén dentro de tu propia cartera.
        </div>
      )}

      <div className="users-admin-grid">
        <section className="zoho-card users-create-card">
          <div className="zoho-card-header">
            <div>
              <h2>{editingUser ? "Editar usuario" : "Crear usuario"}</h2>
              <p>
                {editingUser
                  ? "Modifica rol, estado, contraseña opcional y mandantes asignados."
                  : "Asigna uno o más mandantes para limitar la información visible."}
              </p>
            </div>
          </div>

          <form onSubmit={saveUser} className="zoho-form-grid users-form-grid">
            <Field label="Nombre completo">
              <input
                className="zoho-input"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
                disabled={!canManageUsers}
              />
            </Field>

            <Field label="Correo">
              <input
                className="zoho-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={!canManageUsers}
              />
            </Field>

            <Field label={editingUser ? "Nueva contraseña opcional" : "Contraseña temporal"}>
              <input
                className="zoho-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required={!editingUser}
                disabled={!canManageUsers}
                placeholder={editingUser ? "Dejar vacío para mantener contraseña actual" : "Contraseña temporal"}
              />
            </Field>

            <Field label="Rol">
              <select
                className="zoho-select"
                value={isKamAdmin ? "kam" : form.role}
                disabled={!canManageUsers || isKamAdmin}
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
                <option value="kam_admin">KAM administrador</option>
                <option value="kam">KAM vendedor</option>
                <option value="cliente">Cliente</option>
              </select>
            </Field>

            {editingUser && (
              <Field label="Estado">
                <select
                  className="zoho-select"
                  value={form.active ? "true" : "false"}
                  disabled={!canManageUsers}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.value === "true" }))}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </Field>
            )}

            {form.role !== "admin" && (
              <div className="zoho-form-field users-mandantes-field">
                <label>Mandantes asignados</label>
                <div className="users-mandantes-actions">
                  <button type="button" className="zoho-small-btn" onClick={selectAllMandantes} disabled={!canManageUsers}>
                    Seleccionar todos
                  </button>
                  <button type="button" className="zoho-small-btn" onClick={clearMandantes} disabled={!canManageUsers}>
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
                        disabled={!canManageUsers}
                      />
                      <span>{mandante.name}</span>
                    </label>
                  ))}
                </div>

                <small>
                  Seleccionados: {selectedCount}. El usuario solo verá registros,
                  dashboard, portal, informes y carga asociados a estos mandantes.
                </small>
              </div>
            )}

            <div className="zoho-form-actions users-form-actions">
              {editingUser && (
                <button type="button" className="zoho-btn" onClick={cancelEdit} disabled={saving}>
                  Cancelar edición
                </button>
              )}
              <button className="zoho-btn zoho-btn-primary" disabled={saving || !isAdmin}>
                {saving ? "Guardando..." : editingUser ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </form>
        </section>

        <section className="zoho-card users-rules-card">
          <h2>Reglas de acceso</h2>
          <div className="users-rule-list">
            <div>
              <strong>Administrador</strong>
              <span>Ve todo y puede crear, editar, activar, desactivar y eliminar usuarios.</span>
            </div>
            <div>
              <strong>Interno / KAM vendedor</strong>
              <span>Opera el CRM según sus mandantes asignados. No puede administrar usuarios ni repartir cartera.</span>
            </div>
            <div>
              <strong>KAM administrador</strong>
              <span>Opera su cartera y puede crear/editar KAM vendedores, asignándoles solo mandantes que ya tiene asignados.</span>
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
                    {canManageUsers && (
                      <div className="zoho-actions-row compact-actions">
                        <button className="zoho-small-btn" onClick={() => startEdit(user)}>
                          Editar
                        </button>
                        {user.active ? (
                          <button className="zoho-small-btn danger" onClick={() => setUserActive(user, false)}>
                            Desactivar
                          </button>
                        ) : (
                          <button className="zoho-small-btn" onClick={() => setUserActive(user, true)}>
                            Activar
                          </button>
                        )}
                        <button className="zoho-small-btn danger" onClick={() => deleteUser(user)}>
                          Eliminar
                        </button>
                      </div>
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
