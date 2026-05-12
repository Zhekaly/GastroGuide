"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  emptyMessage?: string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (state: RowSelectionState) => void;
  getRowId?: (row: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  emptyMessage = "Нет данных",
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo(() => columns, [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      ...(rowSelection ? { rowSelection } : {}),
    },
    onSortingChange: setSorting,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const next =
            typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
          onRowSelectionChange(next);
        }
      : undefined,
    enableRowSelection: !!onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                  style={{ width: header.column.columnDef.size }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      header.column.getCanSort() && "cursor-pointer select-none",
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: "↑",
                      desc: "↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={tableColumns.length}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
