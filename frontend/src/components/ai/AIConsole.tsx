import React, { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://operafix-production.up.railway.app";

export default function AIConsole() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSuggestions = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/ai-suggestions/suggestions`
      );

      const json = await res.json();

      if (json.success) {
        setSuggestions(json.suggestions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const run = async (
    mode: "get" | "update",
    dryRun = false
  ) => {
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/ai-actions/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            action: mode,
            dryRun,
            limit: 100,
          }),
        }
      );

      const json = await res.json();
      setResult(json);

      if (mode === "update" && !dryRun) {
        await loadSuggestions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion: any) => {
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/ai-actions/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: "",
            action: "update",
            data: suggestion.suggestedData,
            limit: 1,
          }),
        }
      );

      const json = await res.json();
      setResult(json);

      await loadSuggestions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        display: "grid",
        gap: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          border: "1px solid #ddd",
        }}
      >
        <h2>🤖 IA OperaFix</h2>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej: cambia pendientes de AFP Modelo sobre $1.000.000 a En gestión"
          style={{
            width: "100%",
            minHeight: 100,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        />

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => run("get")}>
            🔎 Consultar
          </button>

          <button onClick={() => run("update", true)}>
            👁️ Preview acción
          </button>

          <button
            onClick={() => run("update", false)}
            style={{
              background: "#dc2626",
              color: "#fff",
            }}
          >
            🚀 Ejecutar acción
          </button>

          <button
            onClick={() =>
              setText(
                "cambia pendientes de AFP Modelo sobre $1.000.000 a En gestión"
              )
            }
          >
            ⚡ Ejemplo
          </button>
        </div>

        {loading && (
          <div style={{ marginTop: 12 }}>
            Procesando IA...
          </div>
        )}

        {result && (
          <pre
            style={{
              marginTop: 20,
              background: "#0f172a",
              color: "#fff",
              padding: 16,
              borderRadius: 10,
              overflowX: "auto",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          border: "1px solid #ddd",
        }}
      >
        <h2>🧠 Sugerencias IA</h2>

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {suggestions.map((s) => (
            <div
              key={s.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <strong>
                {s.suggestedAction}
              </strong>

              <div>
                💰 {Number(s.refund_amount).toLocaleString("es-CL")}
              </div>

              <div>
                📊 {s.management_status}
              </div>

              <div>
                🏦 {s.entity}
              </div>

              <div>
                ⭐ Score: {Math.round(s.score)}
              </div>

              <small
                style={{
                  color: "#666",
                  display: "block",
                  marginTop: 6,
                }}
              >
                {s.reason}
              </small>

              <button
                style={{
                  marginTop: 10,
                }}
                onClick={() =>
                  applySuggestion(s)
                }
              >
                🚀 Aplicar sugerencia
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}