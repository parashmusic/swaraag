const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function analyzeSource(source, { borgeetMode = false, useSeparation = true, tonicHint = null } = {}) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      borgeet_mode: borgeetMode,
      use_separation: useSeparation,
      tonic_hint: tonicHint,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Analysis failed (${res.status})`);
  }
  return res.json();
}

export async function analyzeUpload(file, { borgeetMode = false, useSeparation = true, tonicHint = null } = {}) {
  const form = new FormData();
  form.append("file", file);
  
  const paramsObj = {
    borgeet_mode: borgeetMode,
    use_separation: useSeparation,
  };
  if (tonicHint) {
    paramsObj.tonic_hint = tonicHint;
  }
  const params = new URLSearchParams(paramsObj);
  const res = await fetch(`${API_BASE}/analyze/upload?${params}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Analysis failed (${res.status})`);
  }
  return res.json();
}

/**
 * SSE-based analysis with progress callbacks.
 * Used for long-running analysis (when source separation is active).
 */
export async function analyzeSourceWithProgress(
  source,
  { borgeetMode = false, useSeparation = true, tonicHint = null } = {},
  onProgress = () => {},
) {
  const res = await fetch(`${API_BASE}/analyze/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      borgeet_mode: borgeetMode,
      use_separation: useSeparation,
      tonic_hint: tonicHint,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Analysis failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.type === "progress") {
          onProgress(payload);
        } else if (payload.type === "result") {
          result = payload.data;
        } else if (payload.type === "error") {
          throw new Error(payload.detail);
        }
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
      }
    }
  }

  if (!result) throw new Error("No result received from analysis stream");
  return result;
}

export async function analyzeUploadWithProgress(
  file,
  { borgeetMode = false, useSeparation = true, tonicHint = null } = {},
  onProgress = () => {},
) {
  const form = new FormData();
  form.append("file", file);
  
  const paramsObj = {
    borgeet_mode: borgeetMode,
    use_separation: useSeparation,
  };
  if (tonicHint) {
    paramsObj.tonic_hint = tonicHint;
  }
  const params = new URLSearchParams(paramsObj);
  const res = await fetch(`${API_BASE}/analyze/upload/stream?${params}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Analysis failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.type === "progress") {
          onProgress(payload);
        } else if (payload.type === "result") {
          result = payload.data;
        } else if (payload.type === "error") {
          throw new Error(payload.detail);
        }
      } catch (e) {
        if (e.message && !e.message.includes("JSON")) throw e;
      }
    }
  }

  if (!result) throw new Error("No result received from analysis stream");
  return result;
}

export async function deleteProject(sessionId) {
  const res = await fetch(`${API_BASE}/projects/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to delete project (${res.status})`);
  }
  return res.json();
}

export async function getAvailableRagas() {
  const res = await fetch(`${API_BASE}/ragas`);
  if (!res.ok) throw new Error("Failed to fetch ragas");
  return res.json();
}

export async function updateActualRaga(sessionId, actualRaga) {
  const res = await fetch(`${API_BASE}/projects/${sessionId}/raga`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actual_raga: actualRaga }),
  });
  if (!res.ok) throw new Error("Failed to update raga");
  return res.json();
}

export async function recalculateTonic(sessionId, tonicHint, borgeetMode = false) {
  const res = await fetch(`${API_BASE}/projects/${sessionId}/recalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tonic_hint: tonicHint, borgeet_mode: borgeetMode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Recalculation failed (${res.status})`);
  }
  return res.json();
}

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function getDataset(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.append("limit", params.limit);
  if (params.offset !== undefined) query.append("offset", params.offset);
  if (params.predicted_raga) query.append("predicted_raga", params.predicted_raga);
  if (params.actual_raga) query.append("actual_raga", params.actual_raga);
  if (params.tonic) query.append("tonic", params.tonic);
  if (params.is_correct !== undefined && params.is_correct !== null) query.append("is_correct", params.is_correct);
  
  const res = await fetch(`${API_BASE}/dataset?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch dataset");
  return res.json();
}
