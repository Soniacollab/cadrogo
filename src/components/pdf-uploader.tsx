"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileUp, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatFileSizeMb } from "@/lib/utils";

interface PdfUploaderProps {
  onAnalyze: (file: File) => Promise<void>;
  isAnalyzing: boolean;
}

export function PdfUploader({ onAnalyze, isAnalyzing }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const acceptFile = useCallback((candidate: File | undefined) => {
    setLocalError(null);
    if (!candidate) {
      return;
    }
    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Seuls les fichiers PDF sont acceptés.");
      setFile(null);
      return;
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setLocalError("Le fichier dépasse la limite de 25 Mo.");
      setFile(null);
      return;
    }
    setFile(candidate);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const dropped = event.dataTransfer.files?.[0];
      acceptFile(dropped);
    },
    [acceptFile]
  );

  const handleAnalyze = async () => {
    if (!file || isAnalyzing) {
      return;
    }
    await onAnalyze(file);
  };

  const clearFile = () => {
    setFile(null);
    setLocalError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <Card className="overflow-hidden border-slate-200/70 bg-white/90 backdrop-blur">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative cursor-pointer rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all",
            isDragging
              ? "border-teal-500 bg-teal-50/80"
              : "border-slate-200 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-teal-300 shadow-lg shadow-slate-900/20 transition-transform group-hover:scale-105">
            <FileUp className="h-6 w-6" />
          </div>
          <p className="font-display text-lg font-semibold text-slate-900">
            Déposez votre Appel d&apos;Offres PDF
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Glissez-déposez ou cliquez pour sélectionner · max 25 Mo
          </p>
        </div>

        {file && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSizeMb(file.size)} Mo
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              disabled={isAnalyzing}
              className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Retirer le fichier"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {localError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {localError}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!file || isAnalyzing}
          onClick={handleAnalyze}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            "Lancer l'Analyse"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
