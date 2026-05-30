export type Severity = "alta" | "media" | "baja";
export type ChangeType = "agregado" | "eliminado" | "modificado";
export type RiskLevel = "alto" | "medio" | "bajo";

/**
 * Una diferencia puntual detectada entre las dos versiones del contrato.
 */
export interface ContractChange {
  /** Cláusula o sección afectada (ej. "Cláusula 7 — Penalizaciones"). */
  clause: string;
  /** Categoría de negocio (ej. "Precios", "Plazos de pago", "Responsabilidad"). */
  category: string;
  /** Tipo de cambio respecto a la versión anterior. */
  changeType: ChangeType;
  /** Severidad del cambio para la empresa de retail. */
  severity: Severity;
  /** Texto o resumen de cómo estaba en la versión A (anterior). */
  versionA: string;
  /** Texto o resumen de cómo quedó en la versión B (nueva). */
  versionB: string;
  /** Por qué importa este cambio para el negociador de retail. */
  impact: string;
}

/**
 * Resultado completo de la comparación entre las dos versiones del contrato.
 */
export interface ContractDiff {
  /** Resumen ejecutivo en 2-4 frases. */
  summary: string;
  /** Nivel de riesgo global de aceptar la versión nueva. */
  riskLevel: RiskLevel;
  /** Recomendación accionable para el equipo de negociación. */
  recommendation: string;
  /** Lista de diferencias detectadas, ordenadas por severidad. */
  changes: ContractChange[];
}

/** Metadatos de un documento procesado por PageIndex. */
export interface ProcessedDoc {
  docId: string;
  name: string;
}

/** Estado del indexado en PageIndex. */
export type IndexStatus = "processing" | "completed" | "failed";

/** Documento almacenado en el baúl (carpeta de PageIndex). */
export interface BaulDocument {
  docId: string;
  name: string;
  status: IndexStatus;
  uploadedAt?: string;
  pageCount?: number;
  sectionCount?: number;
  error?: string;
}

/** Nodo del árbol indexado para preview en la UI. */
export interface TreePreviewNode {
  title: string;
  page?: number;
}

/** Detalle de un documento del baúl con preview de estructura indexada. */
export interface BaulDocumentDetail extends BaulDocument {
  treePreview?: TreePreviewNode[];
}

/** Cuerpo del endpoint POST /api/compare. */
export interface CompareRequest {
  docIdA: string;
  docIdB: string;
}

/** Respuesta del endpoint GET /api/documents. */
export interface BaulListResponse {
  folderId: string | null;
  folderName: string;
  /** false si el plan de PageIndex no incluye carpetas y se usa la cuenta completa. */
  usesFolders: boolean;
  documents: BaulDocument[];
}

/** Respuesta del endpoint /api/compare. */
export interface CompareResponse {
  diff: ContractDiff;
  docs: { a: ProcessedDoc; b: ProcessedDoc };
}
