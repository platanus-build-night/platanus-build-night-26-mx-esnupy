"use client";

import { ArrowLeftRight, FileSearch, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DiffView } from "@/components/diff-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BaulDocument, CompareResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ComparePanelProps {
  documents: BaulDocument[];
}

const sortByUploadedAt = (docs: BaulDocument[]): BaulDocument[] =>
  [...docs].sort(
    (a, b) =>
      new Date(a.uploadedAt ?? 0).getTime() - new Date(b.uploadedAt ?? 0).getTime(),
  );

const DocOption = ({
  doc,
  role,
  selected,
  onSelect,
  disabled,
}: {
  doc: BaulDocument;
  role: "A" | "B";
  selected: boolean;
  onSelect: (docId: string) => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onSelect(doc.docId)}
    aria-pressed={selected}
    aria-label={`Elegir ${doc.name} como versión ${role}`}
    className={cn(
      "rounded-xl border p-4 text-left transition-colors",
      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
      selected
        ? role === "A"
          ? "border-muted-foreground bg-muted/60"
          : "border-primary bg-primary/5"
        : "border-border hover:border-primary/50 hover:bg-muted/30",
      disabled && "pointer-events-none opacity-60",
    )}
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <Badge
        className={cn(
          role === "A"
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        Versión {role}
      </Badge>
      {selected ? <Badge variant="outline">Seleccionado</Badge> : null}
    </div>
    <p className="truncate text-sm font-medium">{doc.name}</p>
    <p className="text-muted-foreground mt-1 text-xs">
      {doc.pageCount ? `${doc.pageCount} pág.` : "PDF indexado"}
      {doc.sectionCount ? ` · ${doc.sectionCount} secciones` : ""}
    </p>
  </button>
);

/** Panel para elegir dos documentos del baúl y ejecutar la comparación. */
export const ComparePanel = ({ documents }: ComparePanelProps) => {
  const [docIdA, setDocIdA] = useState<string | null>(null);
  const [docIdB, setDocIdB] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const indexedDocs = useMemo(
    () => documents.filter((doc) => doc.status === "completed"),
    [documents],
  );

  useEffect(() => {
    if (indexedDocs.length !== 2) return;
    const [older, newer] = sortByUploadedAt(indexedDocs);
    setDocIdA(older.docId);
    setDocIdB(newer.docId);
  }, [indexedDocs]);

  const docA = indexedDocs.find((doc) => doc.docId === docIdA);
  const docB = indexedDocs.find((doc) => doc.docId === docIdB);

  const canCompare =
    Boolean(docIdA && docIdB && docIdA !== docIdB) && !isLoading && indexedDocs.length >= 2;

  const handleCompare = async () => {
    if (!docIdA || !docIdB) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docIdA, docIdB }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo completar la comparación.");
      }
      setResult(data as CompareResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    if (indexedDocs.length === 2) {
      const [older, newer] = sortByUploadedAt(indexedDocs);
      setDocIdA(older.docId);
      setDocIdB(newer.docId);
      return;
    }
    setDocIdA(null);
    setDocIdB(null);
  };

  if (indexedDocs.length < 2) {
    return (
      <Card>
        <CardContent className="text-muted-foreground space-y-2 py-10 text-center text-sm">
          <p>Necesitas al menos 2 documentos indexados en el baúl para comparar.</p>
          <p>Ve a la pestaña Baúl, sube tus PDFs y espera a que aparezcan como Indexado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Elige las dos versiones a comparar</h2>
          <p className="text-muted-foreground text-sm">
            Versión A = contrato anterior · Versión B = propuesta nueva del proveedor.
            {indexedDocs.length === 2
              ? " Con 2 documentos indexados ya los preseleccionamos por ti."
              : " Toca un documento en cada columna."}
          </p>
        </div>

        {docA && docB ? (
          <Alert>
            <ArrowLeftRight className="size-4" aria-hidden />
            <AlertTitle>Par seleccionado</AlertTitle>
            <AlertDescription className="space-y-1 text-sm">
              <p>
                <span className="font-medium">A (anterior):</span> {docA.name}
              </p>
              <p>
                <span className="font-medium">B (nueva):</span> {docB.name}
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Versión A (anterior)</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {indexedDocs.map((doc) => (
                <DocOption
                  key={`a-${doc.docId}`}
                  doc={doc}
                  role="A"
                  selected={docIdA === doc.docId}
                  onSelect={setDocIdA}
                  disabled={isLoading || docIdB === doc.docId}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Versión B (nueva)</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {indexedDocs.map((doc) => (
                <DocOption
                  key={`b-${doc.docId}`}
                  doc={doc}
                  role="B"
                  selected={docIdB === doc.docId}
                  onSelect={setDocIdB}
                  disabled={isLoading || docIdA === doc.docId}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleCompare} disabled={!canCompare} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Analizando contratos…
              </>
            ) : (
              <>
                <ArrowLeftRight className="size-4" aria-hidden /> Comparar versiones
              </>
            )}
          </Button>
          {(result || error) && !isLoading ? (
            <Button onClick={handleReset} variant="ghost" size="lg">
              Nueva comparación
            </Button>
          ) : null}
        </div>

        {!canCompare && !isLoading && !result ? (
          <p className="text-muted-foreground text-sm">
            Selecciona un documento distinto para A y para B, luego pulsa Comparar versiones.
          </p>
        ) : null}
      </section>

      {isLoading ? (
        <Alert>
          <FileSearch className="size-4" aria-hidden />
          <AlertTitle>Claude está comparando con PageIndex</AlertTitle>
          <AlertDescription>
            El análisis puede tardar 1–3 minutos. No cierres esta pestaña.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo comparar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? <DiffView result={result} /> : null}
    </div>
  );
};
