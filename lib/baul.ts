import { PageIndexError, type PageIndexClient } from "@pageindex/sdk";

import {
  getBaulFolderName,
  getDocumentMetadata,
  normalizeIndexStatus,
  submitAndWait,
} from "@/lib/pageindex";
import type { BaulDocument, BaulDocumentDetail, TreePreviewNode } from "@/lib/types";

const TREE_PREVIEW_LIMIT = 12;
const ROOT_BAUL_NAME = "Baúl (cuenta PageIndex)";

interface BaulContext {
  folderId: string | null;
  folderName: string;
  usesFolders: boolean;
}

interface TreeNode {
  title?: string;
  name?: string;
  page?: number;
  page_number?: number;
  page_index?: number;
  nodes?: TreeNode[];
  children?: TreeNode[];
}

interface PageIndexTree {
  status?: string;
  result?: TreeNode[];
  tree?: TreeNode[];
  nodes?: TreeNode[];
  page_count?: number;
  num_pages?: number;
}

const isFolderPlanError = (error: unknown): boolean =>
  error instanceof PageIndexError &&
  (error.code === "PLAN_REQUIRED" || error.statusCode === 403);

const resolveDocName = (
  metadata: { name?: string; file_name?: string },
  fallbackId: string,
): string => metadata.name ?? metadata.file_name ?? fallbackId;

const resolveUploadedAt = (metadata: { createdAt?: string; created_at?: string }): string | undefined =>
  metadata.createdAt ?? metadata.created_at;

const flattenTreeNodes = (nodes: TreeNode[] | undefined, limit = TREE_PREVIEW_LIMIT): TreePreviewNode[] => {
  if (!nodes?.length) return [];

  const result: TreePreviewNode[] = [];

  const walk = (node: TreeNode) => {
    if (result.length >= limit) return;
    const title = node.title ?? node.name;
    if (title) {
      result.push({
        title,
        page: node.page_index ?? node.page ?? node.page_number,
      });
    }
    (node.nodes ?? node.children)?.forEach(walk);
  };

  nodes.forEach(walk);
  return result;
};

const countTreeNodes = (nodes: TreeNode[] | undefined): number => {
  if (!nodes?.length) return 0;

  let count = 0;
  const walk = (node: TreeNode) => {
    if (node.title ?? node.name) count += 1;
    (node.nodes ?? node.children)?.forEach(walk);
  };
  nodes.forEach(walk);
  return count;
};

const resolveTreeNodes = (tree: PageIndexTree): TreeNode[] =>
  tree.result ?? tree.tree ?? tree.nodes ?? [];

const resolvePageCount = (
  tree: PageIndexTree,
  nodes: TreeNode[],
  metadataPageNum?: number,
): number | undefined => {
  if (typeof metadataPageNum === "number") return metadataPageNum;
  if (typeof tree.page_count === "number") return tree.page_count;
  if (typeof tree.num_pages === "number") return tree.num_pages;

  let maxPage = 0;
  const walk = (node: TreeNode) => {
    const page = node.page_index ?? node.page ?? node.page_number;
    if (typeof page === "number" && page > maxPage) maxPage = page;
    (node.nodes ?? node.children)?.forEach(walk);
  };
  nodes.forEach(walk);
  return maxPage > 0 ? maxPage : undefined;
};

const mapMetadataToBaulDoc = (
  docId: string,
  metadata: {
    name?: string;
    file_name?: string;
    status?: string;
    createdAt?: string;
    created_at?: string;
    pageNum?: number;
    error?: string;
    message?: string;
  },
): BaulDocument => ({
  docId,
  name: resolveDocName(metadata, docId),
  status: normalizeIndexStatus(metadata.status),
  uploadedAt: resolveUploadedAt(metadata),
  pageCount: metadata.pageNum,
  error: metadata.error ?? metadata.message,
});

const enrichCompletedDoc = async (
  client: PageIndexClient,
  doc: BaulDocument,
): Promise<BaulDocument> => {
  if (doc.status !== "completed") return doc;

  try {
    const tree = (await client.api.getTree(doc.docId)) as PageIndexTree;
    const nodes = resolveTreeNodes(tree);
    return {
      ...doc,
      sectionCount: countTreeNodes(nodes),
      pageCount: resolvePageCount(tree, nodes, doc.pageCount),
    };
  } catch {
    return doc;
  }
};

/**
 * Resuelve el contexto del baúl: carpeta dedicada si el plan lo permite, o la cuenta completa.
 */
export const resolveBaulContext = async (client: PageIndexClient): Promise<BaulContext> => {
  const configuredFolderId = process.env.PAGEINDEX_FOLDER_ID?.trim();
  if (configuredFolderId) {
    await client.setFolderScope(configuredFolderId);
    return {
      folderId: configuredFolderId,
      folderName: getBaulFolderName(),
      usesFolders: true,
    };
  }

  const folderName = getBaulFolderName();

  try {
    const listed = await client.api.listFolders();
    const existing = listed.folders.find((folder) => folder.name === folderName);

    if (existing?.id) {
      await client.setFolderScope(existing.id);
      return { folderId: existing.id, folderName, usesFolders: true };
    }

    const created = await client.api.createFolder({ name: folderName });
    const folderId = created.folder.id;
    await client.setFolderScope(folderId);
    return { folderId, folderName, usesFolders: true };
  } catch (error) {
    if (!isFolderPlanError(error)) throw error;

    return {
      folderId: null,
      folderName: ROOT_BAUL_NAME,
      usesFolders: false,
    };
  }
};

/**
 * Lista los documentos del baúl con status actualizado.
 */
export const listBaulDocs = async (client: PageIndexClient): Promise<{
  folderId: string | null;
  folderName: string;
  usesFolders: boolean;
  documents: BaulDocument[];
}> => {
  const context = await resolveBaulContext(client);
  const listed = await client.api.listDocuments(
    context.folderId ? { folderId: context.folderId } : undefined,
  );

  const documents = await Promise.all(
    listed.documents.map(async (item) => {
      let doc = mapMetadataToBaulDoc(item.id, item);

      if (doc.status === "processing") {
        try {
          const metadata = await getDocumentMetadata(client, item.id);
          doc = mapMetadataToBaulDoc(item.id, metadata);
        } catch {
          // Mantener el estado de la lista si falla el refresh puntual.
        }
      }

      return enrichCompletedDoc(client, doc);
    }),
  );

  return {
    folderId: context.folderId,
    folderName: context.folderName,
    usesFolders: context.usesFolders,
    documents,
  };
};

/**
 * Obtiene el detalle de un documento del baúl, incluyendo preview del árbol indexado.
 */
export const getBaulDocDetail = async (
  client: PageIndexClient,
  docId: string,
): Promise<BaulDocumentDetail> => {
  await resolveBaulContext(client);
  const metadata = await getDocumentMetadata(client, docId);

  const doc: BaulDocumentDetail = mapMetadataToBaulDoc(docId, metadata);

  if (doc.status !== "completed") return doc;

  const tree = (await client.api.getTree(docId)) as PageIndexTree;
  const nodes = resolveTreeNodes(tree);
  doc.sectionCount = countTreeNodes(nodes);
  doc.pageCount = resolvePageCount(tree, nodes, metadata.pageNum);
  doc.treePreview = flattenTreeNodes(nodes);

  return doc;
};

/**
 * Sube un PDF al baúl y espera a que PageIndex termine de indexarlo.
 */
export const uploadToBaul = async (
  client: PageIndexClient,
  file: Blob,
  fileName: string,
): Promise<BaulDocument> => {
  const context = await resolveBaulContext(client);
  const processed = await submitAndWait(client, file, fileName, {
    folderId: context.folderId ?? undefined,
  });

  return getBaulDocDetail(client, processed.docId);
};

/**
 * Elimina un documento del baúl.
 */
export const deleteBaulDoc = async (client: PageIndexClient, docId: string): Promise<void> => {
  await resolveBaulContext(client);
  await client.api.deleteDocument(docId);
};

/**
 * Valida que un documento exista en el baúl y esté indexado.
 */
export const requireCompletedBaulDoc = async (
  client: PageIndexClient,
  docId: string,
): Promise<BaulDocument> => {
  const detail = await getBaulDocDetail(client, docId);
  if (detail.status !== "completed") {
    throw new Error(`El documento "${detail.name}" aún no está indexado (estado: ${detail.status}).`);
  }
  return detail;
};
