"use client";
import React, { useState } from "react";

export default function DocumentUpload({
  onUpload,
}: {
  onUpload: (fd: FormData) => Promise<void>;
}) {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file1 && !file2) return;

    const fd = new FormData();
    if (file2) fd.append("CERTIFICATE_OF_ORIGIN", file2);

    await onUpload(fd);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 p-4 border border-ec-border rounded-xl bg-white">
          <label className="text-sm font-bold text-ec-text flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-action" />
            Packing List
          </label>
          <input
            type="file"
            onChange={(e) => setFile2(e.target.files?.[0] || null)}
            className="block w-full text-xs text-ec-text-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-xs file:font-semibold
              file:bg-ec-navy file:text-white
              hover:file:bg-ec-navy/90"
          />
          {file2 && (
            <p className="text-[10px] text-green-600 font-medium">
              ✓ {file2.name} selected
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="ec-btn-primary w-full py-3 shadow-lg shadow-action/20"
        disabled={!file1 && !file2}
      >
        Upload Documents
      </button>
    </form>
  );
}
