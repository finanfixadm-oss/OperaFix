import { useState } from "react";

const API_BASE =
  "https://operafix-production.up.railway.app";

const USER_ID = "default";

type AIColumn = {
  field: string;
  label: string;
};

type AIMessage = {
  role: "user" | "assistant";
  text: string;
  rows?: Record<string, any>[];
  columns?: AIColumn[];
  canExport?: boolean;
};

export default function AIChatCRMPage() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: "assistant",
      text:
        "Hola 👋 Soy la IA conversacional de OperaFix. Puedes pedirme búsquedas, filtros, agrupaciones y exportaciones del CRM.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!message.trim()) return;

    const currentMessage = message;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: currentMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/ai-chat/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: currentMessage,
            userId: USER_ID,
          }),
        }
      );

      const json = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            json.answer ||
            "No pude procesar la consulta.",
          rows: json.rows || [],
          columns: json.columns || [],
          canExport: json.canExport,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "No pude conectar con el motor IA.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    window.open(
      `${API_BASE}/api/ai-chat/export?userId=${USER_ID}`,
      "_blank"
    );
  };

  return (
    <div style={pageStyle}>
      <aside style={sidebarStyle}>
        <h2 style={{ marginTop: 0 }}>
          🧠 IA OperaFix
        </h2>

        <button
          style={promptButton}
          onClick={() =>
            setMessage(
              "Dame los casos pendientes de Mundo Previsional"
            )
          }
        >
          Pendientes Mundo Previsional
        </button>

        <button
          style={promptButton}
          onClick={() =>
            setMessage(
              "Muéstrame casos con confirmación cc sí y confirmación poder sí"
            )
          }
        >
          Casos listos para gestionar
        </button>

        <button
          style={promptButton}
          onClick={() =>
            setMessage(
              "Qué casos tienen mejor monto devolución"
            )
          }
        >
          Mejores montos
        </button>

        <button
          style={promptButton}
          onClick={() =>
            setMessage(
              "Ahora quiero descargar el resultado en excel"
            )
          }
        >
          Exportar Excel
        </button>
      </aside>

      <main style={mainStyle}>
        <div style={chatBoxStyle}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...bubbleStyle,
                alignSelf:
                  msg.role === "user"
                    ? "flex-end"
                    : "flex-start",
                background:
                  msg.role === "user"
                    ? "#dbeafe"
                    : "#ffffff",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {msg.role === "user"
                  ? "Tú"
                  : "IA OperaFix"}
              </div>

              <div>{msg.text}</div>

              {msg.rows &&
                msg.rows.length > 0 && (
                  <div style={tableWrapper}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          {(msg.columns ||
                            Object.keys(
                              msg.rows[0]
                            )
                              .filter(
                                (field) =>
                                  field !== "id"
                              )
                              .map((field) => ({
                                field,
                                label: field,
                              }))).map(
                            (column) => (
                              <th
                                key={
                                  column.field
                                }
                                style={thStyle}
                              >
                                {
                                  column.label
                                }
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {msg.rows.map(
                          (row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              onClick={() => {
                                if (
                                  row.id
                                ) {
                                  window.open(
                                    `/records/${row.id}`,
                                    "_blank"
                                  );
                                }
                              }}
                              style={{
                                cursor:
                                  row.id
                                    ? "pointer"
                                    : "default",
                              }}
                            >
                              {(msg.columns ||
                                Object.keys(
                                  row
                                )
                                  .filter(
                                    (
                                      field
                                    ) =>
                                      field !==
                                      "id"
                                  )
                                  .map(
                                    (
                                      field
                                    ) => ({
                                      field,
                                      label:
                                        field,
                                    })
                                  )).map(
                                (
                                  column
                                ) => (
                                  <td
                                    key={
                                      column.field
                                    }
                                    style={
                                      tdStyle
                                    }
                                  >
                                    {String(
                                      row[
                                        column
                                          .field
                                      ] ??
                                        "—"
                                    )}
                                  </td>
                                )
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              {msg.canExport && (
                <button
                  style={
                    exportButton
                  }
                  onClick={
                    downloadExcel
                  }
                >
                  Descargar Excel
                </button>
              )}
            </div>
          ))}

          {loading && (
            <div
              style={{
                color: "#64748b",
              }}
            >
              Pensando con IA...
            </div>
          )}
        </div>

        <div style={composerStyle}>
          <textarea
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            placeholder="Escribe una petición al CRM..."
            style={textareaStyle}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button
            style={sendButton}
            onClick={send}
            disabled={loading}
          >
            Enviar
          </button>
        </div>
      </main>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "280px 1fr",
  height: "100vh",
  background: "#f8fafc",
};

const sidebarStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#fff",
  padding: 20,
  overflowY: "auto",
};

const promptButton: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginBottom: 10,
  borderRadius: 10,
  border: 0,
  background: "#1e293b",
  color: "#fff",
  cursor: "pointer",
  textAlign: "left",
};

const mainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  minHeight: 0,
};

const chatBoxStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 20,
  overflowY: "auto",
  overflowX: "hidden",
  scrollBehavior: "smooth",
};

const bubbleStyle: React.CSSProperties = {
  maxWidth: "95%",
  padding: 18,
  borderRadius: 16,
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.06)",
};

const composerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "1fr 120px",
  gap: 12,
  padding: 16,
  borderTop:
    "1px solid #e2e8f0",
  background: "#fff",
};

const textareaStyle: React.CSSProperties = {
  minHeight: 70,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: 12,
  resize: "vertical",
};

const sendButton: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const tableWrapper: React.CSSProperties = {
  marginTop: 16,
  overflowX: "auto",
  border:
    "1px solid #e2e8f0",
  borderRadius: 12,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom:
    "1px solid #e2e8f0",
  background: "#f8fafc",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  borderBottom:
    "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

const exportButton: React.CSSProperties = {
  marginTop: 14,
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};