"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Minus,
  PencilLine,
  Plus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ChangeType,
  CompareResponse,
  ContractChange,
  RiskLevel,
  Severity,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const riskStyles: Record<RiskLevel, string> = {
  alto: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  medio: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  bajo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const severityStyles: Record<Severity, string> = {
  alta: "border-l-red-500",
  media: "border-l-amber-500",
  baja: "border-l-emerald-500",
};

const severityBadge: Record<Severity, string> = {
  alta: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  baja: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const changeTypeMeta: Record<ChangeType, { label: string; icon: typeof Plus; className: string }> = {
  agregado: { label: "Agregado", icon: Plus, className: "text-emerald-600 dark:text-emerald-400" },
  eliminado: { label: "Eliminado", icon: Minus, className: "text-red-600 dark:text-red-400" },
  modificado: { label: "Modificado", icon: PencilLine, className: "text-amber-600 dark:text-amber-400" },
};

const severityOrder: Record<Severity, number> = { alta: 0, media: 1, baja: 2 };

const changeTypeLabels: Record<ChangeType, string> = {
  agregado: "Agregado",
  eliminado: "Eliminado",
  modificado: "Modificado",
};

/** Convierte el resultado de comparación a texto plano para copiar al portapapeles. */
const formatCompareResultAsText = (result: CompareResponse): string => {
  const { diff, docs } = result;
  const lines: string[] = [
    "COMPARACIÓN DE CONTRATOS",
    `Versión A (anterior): ${docs.a.name}`,
    `Versión B (nueva): ${docs.b.name}`,
    "",
    "RESUMEN EJECUTIVO",
    `Riesgo: ${diff.riskLevel}`,
    diff.summary,
    "",
    "RECOMENDACIÓN",
    diff.recommendation,
    "",
    `DIFERENCIAS DETECTADAS (${diff.changes.length})`,
  ];

  if (diff.changes.length === 0) {
    lines.push("No se detectaron diferencias materiales entre las dos versiones.");
    return lines.join("\n");
  }

  const sortedChanges = [...diff.changes].sort(
    (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9),
  );

  sortedChanges.forEach((change, index) => {
    lines.push(
      "",
      `--- Diferencia ${index + 1} ---`,
      `Cláusula: ${change.clause}`,
      `Categoría: ${change.category}`,
      `Tipo: ${changeTypeLabels[change.changeType] ?? change.changeType}`,
      `Severidad: ${change.severity}`,
      `Versión A (anterior): ${change.versionA}`,
      `Versión B (nueva): ${change.versionB}`,
      `Impacto: ${change.impact}`,
    );
  });

  return lines.join("\n");
};

/** Botón para copiar el reporte completo al portapapeles. */
const CopyReportButton = ({ result }: { result: CompareResponse }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatCompareResultAsText(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [result]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "Reporte copiado" : "Copiar reporte completo"}
    >
      {copied ? (
        <>
          <Check className="size-4" aria-hidden /> Copiado
        </>
      ) : (
        <>
          <Copy className="size-4" aria-hidden /> Copiar reporte
        </>
      )}
    </Button>
  );
};

const ChangeCard = ({ change }: { change: ContractChange }) => {
  const meta = changeTypeMeta[change.changeType] ?? changeTypeMeta.modificado;
  const Icon = meta.icon;

  return (
    <Card className={cn("border-l-4", severityStyles[change.severity] ?? "border-l-border")}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{change.clause}</CardTitle>
          <Badge className={cn("font-medium", severityBadge[change.severity])}>
            Severidad {change.severity}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">{change.category}</Badge>
          <span className={cn("inline-flex items-center gap-1 font-medium", meta.className)}>
            <Icon className="size-3.5" aria-hidden /> {meta.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
              Versión A (anterior)
            </p>
            <p className="text-sm">{change.versionA}</p>
          </div>
          <div className="hidden items-center justify-center sm:flex">
            <ArrowRight className="text-muted-foreground size-4" aria-hidden />
          </div>
          <div className="border-primary/30 bg-primary/5 rounded-lg border p-3">
            <p className="text-primary/80 mb-1 text-xs font-semibold uppercase tracking-wide">
              Versión B (nueva)
            </p>
            <p className="text-sm">{change.versionB}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <ShieldAlert className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">Impacto: </span>
            {change.impact}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

/** Renderiza el resultado completo de la comparación de contratos. */
export const DiffView = ({ result }: { result: CompareResponse }) => {
  const { diff, docs } = result;
  const changes = [...diff.changes].sort(
    (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Resultado de la comparación</h2>
        <CopyReportButton result={result} />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="text-primary size-5" aria-hidden /> Resumen ejecutivo
            </CardTitle>
            <Badge className={cn("text-sm font-semibold", riskStyles[diff.riskLevel])}>
              Riesgo {diff.riskLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">{diff.summary}</p>
          <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border p-3 text-sm">
            <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-medium">Recomendación: </span>
              {diff.recommendation}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {diff.changes.length} diferencia(s) detectada(s) · A: {docs.a.name} → B: {docs.b.name}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Diferencias detectadas
        </h2>
        {changes.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              No se detectaron diferencias materiales entre las dos versiones.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {changes.map((change, index) => (
              <ChangeCard key={`${change.clause}-${index}`} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
