"use client";
import { useEffect, useState, useRef } from "react";

type Option = { id: string; email?: string; business_name?: string };

export default function SellerSelector({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState<string>(value || "");
  const [opts, setOpts] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const deb = useRef<number | null>(null);
  useEffect(() => {
    // keep local query in sync when parent provides a value (e.g., after selection)
    if (value !== undefined) {
      const t = window.setTimeout(() => setQuery(value || ""), 0);
      return () => window.clearTimeout(t);
    }
  }, [value]);

  // If user pastes an ID (uuid-like), accept immediately
  useEffect(() => {
    const maybeUUID = query.trim();
    const uuidRe = /^[0-9a-fA-F\-]{36}$/;
    if (uuidRe.test(maybeUUID)) {
      const t = window.setTimeout(() => {
        onChange(maybeUUID);
        setOpts([]);
        setOpen(false);
      }, 0);
      return () => window.clearTimeout(t);
    }
    if (deb.current) window.clearTimeout(deb.current);
    if (!query || query.trim().length < 1) {
      // clear asynchronously to avoid setState-in-effect lint error
      deb.current = window.setTimeout(() => setOpts([]), 0);
      return () => {
        if (deb.current) window.clearTimeout(deb.current);
      };
    }
    deb.current = window.setTimeout(() => {
      fetch(`/api/v1/sellers?query=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((j) => {
          if (Array.isArray(j.items)) setOpts(j.items as Option[]);
        })
        .catch(() => setOpts([]));
    }, 250);
    return () => {
      if (deb.current) window.clearTimeout(deb.current);
    };
  }, [query, onChange]);

  return (
    <div className="relative">
      <input
        className="ec-input mt-1 w-full"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (opts.length > 0) {
              const o = opts[0];
              onChange(o.id);
              setQuery(o.business_name || o.email || o.id);
              setOpen(false);
            } else if (query.trim()) {
              onChange(query.trim());
              setOpen(false);
            }
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(true)}
        placeholder="Search seller by name or paste ID"
        disabled={disabled}
      />
      {open && opts.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-sm">
          {opts.map((o) => (
            <li
              key={o.id}
              className="p-2 hover:bg-ec-surface-raised cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.id);
                setQuery(o.business_name || o.email || o.id);
                setOpen(false);
              }}
            >
              <div className="font-semibold text-ec-text">
                {o.business_name || o.email || o.id}
              </div>
              <div className="text-xs text-ec-text-muted">{o.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
