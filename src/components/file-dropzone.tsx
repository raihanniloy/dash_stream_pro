"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, accept, disabled }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-gray-300"
      } ${disabled ? "opacity-50" : "cursor-pointer"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium mb-1">
          Drop your file here, or click to browse
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Supports CSV, XLSX, and TXT (up to 50MB)
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id="file-input"
          disabled={disabled}
        />
        <label
          htmlFor="file-input"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
        >
          Choose file
        </label>
      </CardContent>
    </Card>
  );
}
