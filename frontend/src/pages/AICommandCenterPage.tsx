import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://operafix-production.up.railway.app";

export default function AICommandCenterPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuggestions();

    const stored = localStorage.getItem("operafix_prompts");

    if (stored) {
      setSavedPrompts(JSON.parse(stored));
    }
  }, []);

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

  const executeAI = async (
    mode: "get" | "update",
    dryRun = false
  ) => {
    if (!prompt.trim()) return;

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
            text: prompt,
            action: mode,
            dryRun,
            limit: 100,
          }),
        }
      );

      const json = await res.json();
      setResult(json);

      if (mode === "update" && !dryRun) {
        loadSuggestions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = () => {
    if (!prompt.trim()) return;

    const updated = [...savedPrompts, prompt];

    setSavedPrompts(updated);

    localStorage.setItem(
      "operafix_prompts",
      JSON.stringify(updated)
    );
  };

  const removePrompt = (index: number) => {
    const updated = savedPrompts.filter((_, i) => i !== index);

    setSavedPrompts(updated);

    localStorage.setItem(
      "operafix_prompts",
      JSON.stringify(updated)
    );
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
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        minHeight: "100vh",
        background: "#f1f5f9",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          background: "#0f172a",
          color: "#fff",
          padding: 20,
          overflowY: "auto",
        }}
      >
        <h2>🧠 Prompts IA</h2>

        <button
          onClick={savePrompt}
          style={{
            width: "100%",
            marginBottom: 20,
            padding: 10,
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          ➕ Guardar prompt
        </button>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {savedPrompts.map((p, i) => (
            <div
              key={i}
              style={{
                background: "#1e293b",
                padding: 12,
                borderRadius: 10,
                cursor: "pointer",
              }}
              onClick={() => setPrompt(p)}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                {p.slice(0, 60)}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePrompt(i);
                }}
                style={{
                  marginTop: 6,
                  background: "transparent",
                  border: "none",
                  color: "#f87171",
                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          padding: 24,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            border: "1px solid #ddd",
          }}
        >
          <h1>🚀 AI Command Center</h1>

          <p
            style={{
              color: "#64748b",
            }}
          >
            Centro operacional IA de OperaFix
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: cambia pendientes de AFP Modelo sobre $1.000.000 a En gestión"
            style={{
              width: "100%",
              minHeight: 120,
              padding: 16,
              borderRadius: 12,
              border: "1px solid #ccc",
              marginTop: 20,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            <button onClick={() => executeAI("get")}>
              🔎 Consultar
            </button>

            <button
              onClick={() =>
                executeAI("update", true)
              }
            >
              👁️ Preview
            </button>

            <button
              onClick={() =>
                executeAI("update", false)
              }
              style={{
                background: "#dc2626",
                color: "#fff",
              }}
            >
              🚀 Ejecutar
            </button>

            <button
              onClick={() =>
                setPrompt(
                  "cambia pendientes de AFP Modelo sobre $1.000.000 a En gestión"
                )
              }
            >
              ⚡ Ejemplo
            </button>
          </div>

          {loading && (
            <div
              style={{
                marginTop: 20,
              }}
            >
              Procesando IA...
            </div>
          )}

          {result && (
            <pre
              style={{
                marginTop: 20,
                background: "#0f172a",
                color: "#fff",
                padding: 20,
                borderRadius: 12,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        {/* SUGERENCIAS */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            border: "1px solid #ddd",
          }}
        >
          <h2>🤖 Sugerencias IA</h2>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 20,
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <strong>
                  {s.suggestedAction}
                </strong>

                <div>
                  💰{" "}
                  {Number(
                    s.refund_amount
                  ).toLocaleString("es-CL")}
                </div>

                <div>
                  📊 {s.management_status}
                </div>

                <div>
                  🏦 {s.entity}
                </div>

                <div>
                  ⭐ Score:{" "}
                  {Math.round(s.score)}
                </div>

                <small
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "#64748b",
                  }}
                >
                  {s.reason}
                </small>

                <button
                  onClick={() =>
                    applySuggestion(s)
                  }
                  style={{
                    marginTop: 12,
                  }}
                >
                  🚀 Aplicar sugerencia
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}