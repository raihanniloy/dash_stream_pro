"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DataTablePreviewProps {
  columns: string[];
  profile: Record<string, { type: string }>;
  data: Record<string, unknown>[];
}

const TYPE_COLORS: Record<string, string> = {
  numeric: "bg-blue-100 text-blue-800",
  categorical: "bg-green-100 text-green-800",
  datetime: "bg-purple-100 text-purple-800",
  text: "bg-gray-100 text-gray-800",
};

export function DataTablePreview({
  columns,
  profile,
  data,
}: DataTablePreviewProps) {
  return (
    <div className="border rounded-lg overflow-auto max-h-96">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span>{col}</span>
                  <Badge
                    variant="secondary"
                    className={`text-xs w-fit ${TYPE_COLORS[profile[col]?.type ?? ""] || ""}`}
                  >
                    {profile[col]?.type || "unknown"}
                  </Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 100).map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} className="whitespace-nowrap">
                  {row[col] != null ? String(row[col]) : "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
