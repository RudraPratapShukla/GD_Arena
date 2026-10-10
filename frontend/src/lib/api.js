/**
 * GD Arena – API client.
 * Fetch /turn, /report, and API key management with timeout.
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? (
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : ""
);

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
  return res.json();
}

export async function fetchTurn(payload) {
  const res = await fetch(`${API_BASE}/api/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`/turn failed: ${res.status}`);
  return res.json();
}

export async function fetchReport(payload) {
  const res = await fetch(`${API_BASE}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) throw new Error(`/report failed: ${res.status}`);
  return res.json();
}

export async function fetchApiKeyStatus() {
  const res = await fetch(`${API_BASE}/api/api-key-status`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`/api-key-status failed: ${res.status}`);
  return res.json();
}

export async function saveApiKey(apiKey) {
  const res = await fetch(`${API_BASE}/api/set-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`/set-api-key failed: ${res.status}`);
  return res.json();
}
