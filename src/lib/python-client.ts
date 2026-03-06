const PYTHON_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function pythonFetch(
  path: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${PYTHON_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `Python service error: ${res.status}`);
  }

  return res.json();
}
