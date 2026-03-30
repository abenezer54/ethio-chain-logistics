/** Session vs persistent token storage for “Remember me”. */
const KEY = "token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
}

export function setStoredToken(token: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(KEY, token);
    sessionStorage.removeItem(KEY);
  } else {
    sessionStorage.setItem(KEY, token);
    localStorage.removeItem(KEY);
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}
