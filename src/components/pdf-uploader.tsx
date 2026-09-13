"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileUp, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (!candidate) return;

    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Merci de choisir un fichier au format PDF.");
      setFile(null);
      return;
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setLocalError(
        "Ce fichier dépasse 25 Mo. Réduisez-le ou découpez le dossier."
      );
      setFile(null);
      return;
    }
    setFile(candidate);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      acceptFile(event.dataTransfer.files?.[0]);
    },
    [acceptFile]
  );

  const handleAnalyze = async () => {
    if (!file || isAnalyzing) return;
    await onAnalyze(file);
  };

  const clearFile = () => {
    setFile(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-12 text-center shadow-panel transition-colors sm:min-h-[320px]",
          isDragging
            ? "border-accent bg-accent/10"
            : "border-line bg-surface hover:border-brand/40 hover:bg-surface-muted/60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <FileUp className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">
          Déposez le cahier des charges
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          Glissez le PDF ici, ou cliquez pour le sélectionner. RC, CCTP, CCAP :
          un seul fichier suffit.
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
          PDF · max. 25 Mo
        </p>
      </div>

      {file && (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-panel">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted">
                {formatFileSizeMb(file.size)} Mo — prêt pour l&apos;audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            disabled={isAnalyzing}
            className="rounded-md p-2 text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            aria-label="Retirer le fichier"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {localError && (
        <p className="shrink-0 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {localError}
        </p>
      )}

      <Button
        size="lg"
        className="h-12 w-full text-base sm:h-14 sm:text-lg"
        disabled={!file || isAnalyzing}
        onClick={handleAnalyze}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Audit en cours…
          </>
        ) : (
          "Lancer l'audit Go / No-Go"
        )}
      </Button>
    </div>
  );
}
