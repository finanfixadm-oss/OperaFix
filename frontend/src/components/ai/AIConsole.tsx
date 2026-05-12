import React, { useState } from "react";

export default function AIConsole() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);

  const run = async (mode: "get" | "update") => {
    const res = await fetch("/api/ai/nl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        action: mode,
        data: mode === "update" ? { tag_manual: "UPDATED_BY_AI" } : undefined,
      }),
    });

    const json = await res.json();
    setResult(json);
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>IA Operativa</h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ej: pendientes de AFP Modelo sobre $1.000.000"
        style={{ width: "100%", height: 80 }}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={() => run("get")}>Consultar</button>
        <button onClick={() => run("update")} style={{ marginLeft: 10 }}>
          Ejecutar acción
        </button>
      </div>

      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}