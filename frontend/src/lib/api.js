/**
 * GD Arena – API client.
 * Fetch /turn and /report with timeout.
 */

const API_BASE = "http://localhost:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
  return res.json();
}

export async function fetchTurn(payload) {
  const res = await fetch(`${API_BASE}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`/turn failed: ${res.status}`);
  return res.json();
}

export async function fetchReport(payload) {
  const res = await fetch(`${API_BASE}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) throw new Error(`/report failed: ${res.status}`);
  return res.json();
}
