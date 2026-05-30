"use client";

import { ArrowLeftRight, ChevronDown, ChevronUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { FormattedDate } from "@/components/formatted-date";
import { IndexStatusBadge } from "@/components/index-status-badge";
import { MultiFileDrop } from "@/components/multi-file-drop";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BaulDocument, BaulDocumentDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BaulPanelProps {
  documents: BaulDocument[];
  usesFolders: boolean;
  folderName: string;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<unknown>;
  onReadyToCompare?: () => void;
}

const DocRow = ({
  doc,
  onDelete,
  onRefreshDetail,
}: {
  doc: BaulDocument;
  onDelete: (docId: string) => void;
  onRefreshDetail: (docId: string) => Promise<BaulDocumentDetail | null>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<BaulDocumentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleToggleDetail = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    if (detail || doc.status !== "completed") return;

    setLoadingDetail(true);
    const fetched = await onRefreshDetail(doc.docId);
    setDetail(fetched);
    setLoadingDetail(false);
  };

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">{doc.name}</CardTitle>
            <p className="text-muted-foreground text-xs">
              Subido: <FormattedDate value={doc.uploadedAt} />
              {doc.pageCount ? ` · ${doc.pageCount} pág.` : ""}
              {doc.sectionCount ? ` · ${doc.sectionCount} secciones` : ""}
            </p>
          </div>
          <IndexStatusBadge status={doc.status} />
        </div>

        {doc.status === "failed" && doc.error ? (
          <Alert variant="destructive">
            <AlertTitle>No se indexó</AlertTitle>
            <AlertDescription className="text-sm">{doc.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {doc.status === "completed" ? (
            <Button type="button" variant="outline" size="sm" onClick={handleToggleDetail}>
              {expanded ? (
                <>
                  <ChevronUp className="size-4" aria-hidden /> Ocultar estructura
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" aria-hidden /> Ver qué se indexó
                </>
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(doc.docId)}
            aria-label={`Eliminar ${doc.name}`}
          >
            <Trash2 className="size-4" aria-hidden /> Eliminar
          </Button>
        </div>
      </CardHeader>

      {expanded ? (
        <CardContent className="border-t pt-4">
          {loadingDetail ? (
            <p className="text-muted-foreground inline-flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando estructura…
            </p>
          ) : detail?.treePreview?.length ? (
            <ul className="space-y-1 text-sm">
              {detail.treePreview.map((node, index) => (
                <li key={`${node.title}-${index}`} className="flex items-baseline gap-2">
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {node.page ? `p. ${node.page}` : "—"}
                  </span>
                  <span>{node.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              PageIndex terminó el indexado, pero no hay preview de secciones disponible.
            </p>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
};

/** Panel del baúl: subida, listado y visibilidad del indexado. */
export const BaulPanel = ({
  documents,
  usesFolders,
  folderName,
  isLoading,
  error,
  onRefresh,
  onReadyToCompare,
}: BaulPanelProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const processingCount = documents.filter((doc) => doc.status === "processing").length;
  const completedCount = documents.filter((doc) => doc.status === "completed").length;

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadErrors([]);
    setActionError(null);

    const errors: string[] = [];

    await Promise.allSettled(
      files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);

        try {
          const response = await fetch("/api/documents", { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error ?? `No se pudo indexar "${file.name}".`);
          }
        } catch (caught) {
          errors.push(caught instanceof Error ? caught.message : `Error con "${file.name}".`);
        }
      }),
    );

    await onRefresh();
    setUploadErrors(errors);
    setIsUploading(false);
  };

  const handleDelete = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo eliminar el documento.");
      }
      await onRefresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Error al eliminar.");
    }
  };

  const handleRefreshDetail = async (docId: string): Promise<BaulDocumentDetail | null> => {
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`);
      const data = await response.json();
      if (!response.ok) return null;
      return data as BaulDocumentDetail;
    } catch {
      return null;
    }
  };

  const listError = error ?? actionError;

  return (
    <div className="space-y-6">
      {completedCount >= 2 ? (
        <Alert>
          <ArrowLeftRight className="size-4" aria-hidden />
          <AlertTitle>Listo para comparar</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              Tienes {completedCount} documento(s) indexado(s). Ve a Comparar y pulsa el botón de
              comparación.
            </span>
            {onReadyToCompare ? (
              <Button type="button" size="sm" onClick={onReadyToCompare}>
                Ir a comparar
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Sube contratos al baúl</h2>
          <p className="text-muted-foreground text-sm">
            Cada PDF se indexa en PageIndex
            {folderName ? ` (${folderName})` : ""}. Aquí ves qué sí se indexó y qué falló antes de
            comparar.
            {!usesFolders ? (
              <>
                {" "}
                Tu plan no incluye carpetas; se listan todos los documentos de tu cuenta PageIndex.
              </>
            ) : null}
          </p>
        </div>

        <MultiFileDrop
          label="Arrastra PDFs al baúl"
          disabled={isUploading}
          onFilesSelected={handleUpload}
        />

        {isUploading ? (
          <Alert>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <AlertTitle>Indexando en PageIndex</AlertTitle>
            <AlertDescription>
              Esto puede tardar entre 30 y 90 segundos por archivo según el tamaño del PDF.
            </AlertDescription>
          </Alert>
        ) : null}

        {uploadErrors.length ? (
          <Alert variant="destructive">
            <AlertTitle>Algunos archivos no se indexaron</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {uploadErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Documentos en el baúl</h2>
            <p className="text-muted-foreground text-sm">
              {completedCount} indexado(s) · {processingCount} en proceso
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void onRefresh()}>
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} aria-hidden />
            Actualizar
          </Button>
        </div>

        {listError ? (
          <Alert variant="destructive">
            <AlertTitle>Error al cargar el baúl</AlertTitle>
            <AlertDescription>{listError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="text-muted-foreground inline-flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando baúl…
          </p>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Aún no hay documentos. Sube al menos dos PDFs indexados para poder comparar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <DocRow
                key={doc.docId}
                doc={doc}
                onDelete={handleDelete}
                onRefreshDetail={handleRefreshDetail}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
