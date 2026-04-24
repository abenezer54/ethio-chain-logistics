"use client";
import { useState } from "react";

export default function SellerLogin({
  onLogin,
}: {
  onLogin: (token: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("login failed");
      const j = await res.json();
      const token = (j as { token?: string }).token || "";
      onLogin(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "error";
      setErr(msg);
    }
  }
  return (
    <form onSubmit={submit}>
      <div>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {err && <div style={{ color: "red" }}>{err}</div>}
      <button type="submit">Login</button>
    </form>
  );
}
