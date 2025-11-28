// monitoring/static/monitoring/js/ajax_api.js

// CSRF token is defined in base.html as CSRF_TOKEN.
// This file provides small helpers for making API calls.

async function apiGet(url) {
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("GET " + url + " failed:", resp.status, text);
    throw new Error("GET " + url + " failed");
  }

  return resp.json();
}

async function apiPost(url, payload) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // CSRF token (not required for @csrf_exempt, but harmless)
  if (typeof CSRF_TOKEN !== "undefined" && CSRF_TOKEN) {
    headers["X-CSRFToken"] = CSRF_TOKEN;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("POST " + url + " failed:", resp.status, text);
    alert("Failed to save contact. (" + resp.status + ")");
    throw new Error("POST " + url + " failed");
  }

  // backend returns JSON like {status:"ok", id:...}
  try {
    return await resp.json();
  } catch (_) {
    return {};
  }
}
