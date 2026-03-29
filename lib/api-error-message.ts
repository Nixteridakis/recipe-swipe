/**
 * Prefer a structured `message` from JSON API errors; avoid showing raw `{"error":...}` to users.
 */
export function userMessageFromApiJsonBody(
  bodyText: string,
  httpStatus: number
): string | null {
  const trimmed = bodyText.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const data = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return humanizeKnownApiError(data.error.trim(), httpStatus);
    }
  } catch {
    return null;
  }
  return null;
}

const ERROR_CODE_MESSAGES: Record<string, string> = {
  fetch_forbidden:
    "That site blocked our server from loading the page (common with anti-bot or cookie walls). Use the Brasserie Chrome extension while the recipe tab is open, or copy the full page HTML (View source) and paste it under “Paste source code,” then click Import from HTML.",
  fetch_http_error:
    "The recipe page returned an error, so we couldn’t read it from here. Try again later, use the extension, or paste the page HTML instead.",
  fetch_failed:
    "We couldn’t connect to that URL from the server. Check the link, or use the Chrome extension / pasted HTML.",
  no_jsonld_recipe:
    "We didn’t find schema.org Recipe data (JSON-LD) in that HTML. Many sites still work via the Chrome extension, or try another URL that publishes machine-readable recipes.",
  bad_request:
    "Add a recipe URL, or paste HTML in the fallback section.",
};

function humanizeKnownApiError(error: string, httpStatus: number): string {
  if (ERROR_CODE_MESSAGES[error]) {
    return ERROR_CODE_MESSAGES[error];
  }
  // Legacy / machine-ish strings → friendly copy
  if (
    error.includes("403") ||
    error.toLowerCase().includes("blocked bot") ||
    error.toLowerCase().includes("automation")
  ) {
    return (
      "That site wouldn’t let our server download the page (often anti-bot or regional blocking). " +
      "Try the Brasserie Chrome extension on the open tab, or paste the page’s HTML source in the “Paste source code” section below."
    );
  }
  if (error.includes("Failed to fetch the URL") || error.toLowerCase().includes("network error")) {
    return (
      "We couldn’t reach that URL from the server. Check the link, your connection, or try the extension / pasted HTML instead."
    );
  }
  if (error.includes("No JSON-LD Recipe")) {
    return (
      "No recipe structured data (JSON-LD Recipe) was found on that page. The site may embed the recipe only in plain HTML, or use a format we don’t parse yet—try the extension or another source."
    );
  }
  if (error.includes("Missing `url`")) {
    return "Add a recipe URL, or paste HTML in the fallback section.";
  }
  // Default: show API error text if it looks human (not a bare snake_case code)
  if (!/^[a-z][a-z0-9_]+$/i.test(error)) {
    return error;
  }
  return httpStatus >= 400 ? `Something went wrong (${httpStatus}).` : error;
}

export function formatFailedFetchMessage(
  bodyText: string,
  httpStatus: number
): string {
  const fromJson = userMessageFromApiJsonBody(bodyText, httpStatus);
  if (fromJson) return fromJson;
  if (bodyText.trim()) return bodyText.trim();
  return `Request failed (${httpStatus}).`;
}
