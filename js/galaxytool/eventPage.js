/**
 * XHTTP bridge para content scripts (GET/POST) usando fetch.
 * Devuelve siempre: { ok, status, statusText, responseText }
 */

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  sendRequest(request)
    .then(callback)
    .catch((err) => callback({ ok: false, status: 0, statusText: "SW_ERROR", responseText: String(err) }));

  return true; // IMPORTANTÍSIMO: async
});

async function sendRequest(request) {
  if (!request || request.action !== "xhttp") {
    return { ok: false, status: 0, statusText: "NO_ACTION", responseText: "" };
  }

  const method = (request.method || "GET").toUpperCase();
  const url = request.url;

  const headersObj = request.headers || {};
  const headers = new Headers(headersObj);

  // Si es POST y no traen Content-Type, lo ponemos.
  if (method === "POST" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
  }

  const res = await fetch(url, {
    method,
    headers,
    mode: "cors",
    cache: "no-cache",
    body: method === "POST" ? (request.data || "") : undefined
  });

  const text = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    responseText: text
  };
}
