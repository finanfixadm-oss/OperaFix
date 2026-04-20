import type { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  title: string;
  rows: T[];
  columns: Column<T>[];
}

export default function SimpleTable<T extends { id?: string }>({ title, rows, columns }: Props<T>) {
  return (
    <div className="table-card">
      <div className="table-toolbar compact">
        <h3>{title}</h3>
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
              rows.map((row, index) => (
                <tr key={row.id || index}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>
                      {column.render
                        ? column.render(row)
                        : String((row as any)[column.key as string] ?? "")}
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
