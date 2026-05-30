"use client";

import { Archive, ArrowLeftRight, ScrollText } from "lucide-react";
import { useState } from "react";

import { BaulPanel } from "@/components/baul-panel";
import { ComparePanel } from "@/components/compare-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBaulDocuments } from "@/hooks/use-baul-documents";

const Home = () => {
  const [activeTab, setActiveTab] = useState("baul");
  const {
    documents,
    completedDocuments,
    usesFolders,
    folderName,
    isLoading,
    error,
    fetchDocuments,
  } = useBaulDocuments();

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-5">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
            <ScrollText className="size-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Contract Diff</h1>
            <p className="text-muted-foreground text-sm">
              Baúl de contratos · indexación visible · comparación con Claude + PageIndex
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="baul">
              <Archive className="size-4" aria-hidden /> Baúl
            </TabsTrigger>
            <TabsTrigger value="compare">
              <ArrowLeftRight className="size-4" aria-hidden /> Comparar
              {completedDocuments.length > 0 ? ` (${completedDocuments.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="baul">
            <BaulPanel
              documents={documents}
              usesFolders={usesFolders}
              folderName={folderName}
              isLoading={isLoading}
              error={error}
              onRefresh={fetchDocuments}
              onReadyToCompare={() => setActiveTab("compare")}
            />
          </TabsContent>

          <TabsContent value="compare">
            <ComparePanel documents={documents} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Home;
