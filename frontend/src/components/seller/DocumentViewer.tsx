"use client";
import React from "react";
import { API_BASE } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";

type Doc = {
  id: string;
  shipment_id: string;
  original_file_name: string;
  content_type?: string;
};

import { ImageOff, FileText, File } from "lucide-react";

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

                <div className="min-w-0">
                  <span className="text-ec-text font-medium truncate block">
                    {d.original_file_name}
                  </span>
                  <div className="text-xs text-ec-text-muted mt-1 uppercase">
                    {d.content_type?.split("/")[1] ?? "unknown"}
                    {url ? (
                      <a
                        href={url}
                        download={d.original_file_name}
                        className="mt-2 inline-block text-xs font-semibold text-ec-accent hover:underline"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="mt-2 inline-block text-xs text-ec-text-muted">
                        Loading file...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
