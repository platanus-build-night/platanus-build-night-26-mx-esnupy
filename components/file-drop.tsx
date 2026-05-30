"use client";

import { FileText, UploadCloud, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface FileDropProps {
  label: string;
  badge: string;
  badgeClassName?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Zona de subida de un único PDF con soporte drag & drop y selección por clic. */
export const FileDrop = ({
  label,
  badge,
  badgeClassName,
  file,
  onFileChange,
  disabled = false,
}: FileDropProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelect = (selected: File | null) => {
    if (!selected) return;
    onFileChange(selected);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleSelect(event.dataTransfer.files?.[0] ?? null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label
      htmlFor={inputId}
      tabIndex={0}
      aria-label={`${label}. ${file ? `Archivo seleccionado: ${file.name}` : "Arrastra un PDF o haz clic para subir"}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          badgeClassName ?? "bg-muted text-muted-foreground",
        )}
      >
        {badge}
      </span>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleSelect(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="text-primary size-8" aria-hidden />
          <div className="max-w-full">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground text-xs">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
            aria-label="Quitar archivo"
          >
            <X className="size-3" aria-hidden /> Quitar
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="text-muted-foreground group-hover:text-primary size-8 transition-colors" aria-hidden />
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-muted-foreground text-xs">Arrastra un PDF o haz clic para subir</p>
          </div>
        </div>
      )}
    </label>
  );
};
