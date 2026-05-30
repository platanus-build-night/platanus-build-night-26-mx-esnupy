"use client";

import { FileText, UploadCloud } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface MultiFileDropProps {
  label: string;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
}

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

/** Zona de subida de múltiples PDFs con drag & drop. */
export const MultiFileDrop = ({ label, disabled = false, onFilesSelected }: MultiFileDropProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const pdfs = Array.from(fileList).filter(isPdfFile);
    if (pdfs.length) onFilesSelected(pdfs);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <label
      htmlFor={inputId}
      tabIndex={0}
      aria-label={`${label}. Arrastra PDFs o haz clic para subir varios archivos`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      <UploadCloud
        className="text-muted-foreground group-hover:text-primary size-8 transition-colors"
        aria-hidden
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">
          Arrastra uno o varios PDFs, o haz clic para elegirlos
        </p>
      </div>
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <FileText className="size-3.5" aria-hidden /> Solo PDF · máx. 25 MB c/u
      </span>
    </label>
  );
};
