function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, value);
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

async function request(endpoint, { method = "GET", params = {}, body } = {}) {
  const response = await fetch(`${endpoint}${buildQuery(params)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({
    success: false,
    message: "The server returned a non-JSON response.",
  }));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed for ${endpoint}`);
  }

  return payload;
}

export function getJSON(endpoint, params = {}) {
  return request(endpoint, { method: "GET", params });
}

export function postJSON(endpoint, body = {}) {
  return request(endpoint, { method: "POST", body });
}
