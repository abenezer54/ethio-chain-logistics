"use client";

import { useId, type HTMLInputTypeAttribute } from "react";

type LabeledInputProps = {
  label: string;
  type?: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
};

export function LabeledInput({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
  error,
  success,
  disabled,
}: LabeledInputProps) {
  const genId = useId();
  const id = `field-${genId}`;
  const errId = `${id}-error`;

  const inputClass =
    "ec-input disabled:cursor-not-allowed disabled:opacity-60" +
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
      <input
        id={id}
        type={type}
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
      {error ? (
        <p
          id={errId}
          className="ec-form-message-in text-sm text-ec-danger"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
