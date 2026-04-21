import React from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  title: string;
  columns: Column<T>[];
  rows: T[];
}

export default function DataTable<T extends { id: string }>({ title, columns, rows }: Props<T>) {
  return (
    <div className="table-wrapper widget-card span-full">
      <div className="table-header">
        <h3>{title}</h3>
        <div className="table-actions">
          <button className="ghost-btn">Filtrar</button>
          <button className="ghost-btn">Ordenar</button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="crm-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>Sin registros</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>
                      {column.render ? column.render(row) : String((row as any)[column.key as string] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
