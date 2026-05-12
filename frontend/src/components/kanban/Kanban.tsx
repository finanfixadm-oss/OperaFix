import React from 'react';
export default function Kanban() {
  return (
    <div>
      <h2>Kanban Base</h2>
      <div style={{display:'flex', gap:20}}>
        <div>Pendiente</div>
        <div>En gestión</div>
        <div>Pagado</div>
      </div>
    </div>
  );
}