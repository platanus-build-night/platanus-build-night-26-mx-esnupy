"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BaulDocument, BaulListResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 3_000;

/** Carga y mantiene sincronizada la lista de documentos del baúl. */
export const useBaulDocuments = () => {
  const [documents, setDocuments] = useState<BaulDocument[]>([]);
  const [usesFolders, setUsesFolders] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo cargar el baúl.");
      }
      const payload = data as BaulListResponse;
      setDocuments(payload.documents);
      setFolderName(payload.folderName);
      setUsesFolders(payload.usesFolders);
      setError(null);
      return payload.documents;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error al cargar el baúl.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === "processing");
    if (!hasProcessing) return;

    const timer = window.setInterval(() => {
      void fetchDocuments();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [documents, fetchDocuments]);

  const completedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "completed"),
    [documents],
  );

  return {
    documents,
    completedDocuments,
    usesFolders,
    folderName,
    isLoading,
    error,
    fetchDocuments,
  };
};
