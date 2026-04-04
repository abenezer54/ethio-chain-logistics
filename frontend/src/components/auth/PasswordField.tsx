"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete: "new-password" | "current-password";
  placeholder?: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
};

export function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder = "••••••••",
  error,
  success,
  disabled,
}: PasswordFieldProps) {
  const genId = useId();
  const id = idProp ?? `pwd-${genId}`;
  const errId = `${id}-error`;
  const [visible, setVisible] = useState(false);

  const inputClass =
    "ec-input pr-11 disabled:cursor-not-allowed disabled:opacity-60" +
    (error
      ? " border-ec-danger/80 focus:border-ec-danger focus:ring-ec-danger/25"
      : "") +
    (success && !error
      ? " border-emerald-500/70 focus:border-emerald-600 focus:ring-emerald-500/25"
      : "");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="ec-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errId : undefined}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ec-text-muted transition-all duration-200 hover:bg-ec-surface hover:text-ec-text active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent motion-reduce:active:scale-100"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? (
        <p
          id={errId}
          className="ec-form-message-in text-sm text-ec-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
