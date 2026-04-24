"use client";
import React from "react";

export default function DocumentUpload({
  onUpload,
}: {
  onUpload: (data: unknown) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [type, setType] = React.useState("PROFORMA_INVOICE");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    // For simplicity we expect storage is handled elsewhere; emit metadata
    onUpload({
      fileName: file.name,
      docType: type,
      size: file.size,
      contentType: file.type,
    });
  }
  return (
    <form onSubmit={submit}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option>PROFORMA_INVOICE</option>
        <option>CERTIFICATE_OF_ORIGIN</option>
      </select>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit">Upload</button>
    </form>
  );
}
