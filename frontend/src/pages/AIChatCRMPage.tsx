
import { useState } from "react";

const API_BASE =
  "https://operafix-production.up.railway.app";

export default function AIChatCRMPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
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
            message,
          }),
        }
      );

      const json = await res.json();
      setResult(json);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>🧠 OperaFix AI CRM</h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ej: Dame los casos pendientes de Mundo Previsional con CC sí y poder sí"
        style={{
          width: "100%",
          minHeight: 120,
          padding: 12,
        }}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={send}>
          Consultar IA
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: 20 }}>
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
            borderRadius: 10,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
