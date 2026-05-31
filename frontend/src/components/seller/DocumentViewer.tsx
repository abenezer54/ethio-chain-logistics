"use client";
import React from "react";
import { API_BASE } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";

type Doc = {
  id: string;
  shipment_id: string;
  original_file_name: string;
  content_type?: string;
  size_bytes?: number;
  sha256_hash?: string;
  uploaded_at?: string;
  verification_status?: string;
};

import { ImageOff, FileText, File, Hash, Clock, HardDrive } from "lucide-react";

// Helper to format bytes
function formatBytes(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default function DocumentViewer({
  docs,
  apiPrefix = "/api/v1/importer",
  documentPathSegment = "documents",
}: {
  docs: Doc[];
  apiPrefix?: string;
  documentPathSegment?: string;
}) {
  const [errorImages, setErrorImages] = React.useState<Record<string, boolean>>(
    {},
  );
  const [docObjectUrls, setDocObjectUrls] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    const token = getStoredToken();
    if (!token || docs.length === 0) {
      setDocObjectUrls({});
      return;
    }

    const controller = new AbortController();
    const createdUrls: string[] = [];

    const loadDocs = async () => {
      const entries = await Promise.all(
        docs.map(async (d) => {
          const url = `${API_BASE}${apiPrefix}/shipments/${d.shipment_id}/${documentPathSegment}/${d.id}/download`;
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            });
            if (!res.ok) return [d.id, ""] as const;
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            createdUrls.push(objectUrl);
            return [d.id, objectUrl] as const;
          } catch {
            return [d.id, ""] as const;
          }
        }),
      );

      if (!controller.signal.aborted) {
        setDocObjectUrls(Object.fromEntries(entries.filter(([, v]) => !!v)));
      }
    };

    loadDocs();

    return () => {
      controller.abort();
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [docs, apiPrefix, documentPathSegment]);

  return (
    <div>
      <h4 className="text-sm font-semibold text-ec-text">Documents</h4>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {docs.map((d) => {
          const url = docObjectUrls[d.id];
          const lower = (d.original_file_name || "").toLowerCase();
          const isImage =
            d.content_type?.startsWith("image/") ||
            /(png|jpe?g|gif|bmp|webp)$/.test(lower);
          const isPdf =
            d.content_type === "application/pdf" || lower.endsWith(".pdf");
          const hasError = errorImages[d.id];

          return (
            <div
              key={d.id}
              className="rounded-md border border-ec-border bg-ec-surface-raised p-3"
            >
              <div className="flex flex-col gap-3">
                {isImage && !hasError ? (
                  <div className="w-full">
                    <img
                      src={url}
                      alt={d.original_file_name}
                      onError={() =>
                        setErrorImages((prev) => ({ ...prev, [d.id]: true }))
                      }
                      className="max-h-96 w-full object-contain rounded bg-white shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col h-32 w-full items-center justify-center rounded bg-ec-card text-ec-text-muted border border-ec-border border-dashed">
                    {isImage && hasError ? (
                      <>
                        <ImageOff
                          className="mb-2 text-ec-text-muted"
                          size={24}
                        />
                        <span className="text-xs">Image unavailable</span>
                      </>
                    ) : isPdf ? (
                      <>
                        <FileText className="mb-2 text-ec-accent" size={24} />
                        <span className="text-sm font-medium">
                          PDF Document
                        </span>
                      </>
                    ) : (
                      <>
                        <File className="mb-2 text-ec-text-muted" size={24} />
                        <span className="text-sm font-medium">
                          File Attachment
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="min-w-0 pt-2 border-t border-ec-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-ec-text font-bold truncate block">
                          {d.original_file_name}
                        </span>
                        {d.verification_status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-600 text-[10px] font-semibold rounded border border-red-200">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                    {url && (
                      <a
                        href={url}
                        download={d.original_file_name}
                        className="rounded-md bg-ec-accent/10 px-2 py-1 text-[10px] font-bold text-ec-accent hover:bg-ec-accent hover:text-white transition-colors flex-shrink-0"
                      >
                        Download
                      </a>
                    )}
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-ec-text-muted">
                    <div className="flex items-center gap-1.5">
                      <HardDrive size={12} className="text-ec-accent/60" />
                      {formatBytes(d.size_bytes)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-ec-accent/60" />
                      {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : "Unknown date"}
                    </div>
                  </div>

                  {d.sha256_hash && (
                    <div className="mt-3 flex items-center gap-2 rounded bg-ec-surface px-2 py-1.5 font-mono text-[9px] text-ec-text-secondary border border-ec-border">
                      <Hash size={10} className="text-emerald-500 shrink-0" />
                      <span className="truncate" title={d.sha256_hash}>
                        {d.sha256_hash.slice(0, 16)}...{d.sha256_hash.slice(-8)}
                      </span>
                    </div>
                  )}

                  {!url && (
                    <span className="mt-2 inline-block text-xs text-ec-text-muted animate-pulse">
                      Generating secure link...
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
