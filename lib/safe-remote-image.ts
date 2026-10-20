import { lookup } from "dns/promises";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { isIP } from "net";

const MAX_REDIRECTS = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  if (isIP(address) !== 6) return true;

  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) return true;
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("2001:db8:")
  );
}

async function resolvePublicUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("INVALID_IMAGE_URL");
  }
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("INVALID_IMAGE_URL");

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("INVALID_IMAGE_URL");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("INVALID_IMAGE_URL");
  }
  return addresses[0];
}

function requestPinned(url: URL, address: string, family: number) {
  return new Promise<Response>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        headers: { Accept: "image/*" },
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [{ address, family: family as 4 | 6 }]);
            return;
          }
          callback(null, address, family as 4 | 6);
        },
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
          else if (value != null) headers.set(name, value);
        }

        if (status >= 300 && status < 400) {
          response.resume();
          resolve(new Response(null, { status, headers }));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;
        response.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_IMAGE_BYTES) {
            request.destroy(new Error("INVALID_IMAGE_URL"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve(new Response(Buffer.concat(chunks), { status, headers })));
      },
    );
    request.setTimeout(10_000, () => request.destroy(new Error("INVALID_IMAGE_URL")));
    request.on("error", reject);
    request.end();
  });
}

export async function fetchPublicImage(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_IMAGE_URL");
  }

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const resolved = await resolvePublicUrl(url);
    const response = await requestPinned(url, resolved.address, resolved.family);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("INVALID_IMAGE_URL");
      url = new URL(location, url);
      continue;
    }

    return response;
  }

  throw new Error("INVALID_IMAGE_URL");
}
