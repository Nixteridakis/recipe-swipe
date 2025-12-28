const apiBaseInput = document.getElementById("apiBase");
const extractBtn = document.getElementById("extract");
const copyBtn = document.getElementById("copy");
const sendBtn = document.getElementById("send");
const debugBtn = document.getElementById("debug");
const messageEl = document.getElementById("message");
const metaEl = document.getElementById("meta");

const STORAGE_KEY = "recipe-book-api-base";

function showMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = type;
  messageEl.style.display = text ? "block" : "none";
}

function showMeta(text) {
  metaEl.textContent = text;
}

// Restore API base URL
chrome.storage.local.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) apiBaseInput.value = result[STORAGE_KEY];
  else apiBaseInput.value = "http://localhost:3000";
});

// Persist API base on change
apiBaseInput.addEventListener("change", () => {
  chrome.storage.local.set({
    [STORAGE_KEY]: apiBaseInput.value.trim() || "http://localhost:3000",
  });
});

/** Injected into the page to extract JSON-LD Recipe */
function getExtractScript() {
  return function () {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "null");
        const nodes = Array.isArray(data)
          ? data
          : data && data["@graph"]
            ? data["@graph"]
            : data
              ? [data]
              : [];

        // Build an @id -> node index so we can resolve patterns like:
        // { mainEntity: { "@id": "#recipe" } } + a separate { "@id": "#recipe", "@type": "Recipe", ... } in @graph.
        const nodesById = {};
        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          const id = node["@id"];
          if (typeof id === "string" && id) nodesById[id] = node;
        }

        function includesRecipeType(t) {
          const arr = Array.isArray(t) ? t : t ? [t] : [];
          return arr
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes("recipe"));
        }

        function resolveById(obj) {
          if (!obj || typeof obj !== "object") return obj;
          const id = obj["@id"];
          if (typeof id === "string" && id && nodesById[id]) return nodesById[id];
          return obj;
        }

        // Generic deep search with a budget so we don't blow up on large JSON-LD blobs.
        function deepFindRecipe(root) {
          let steps = 0;
          const maxSteps = 20000;
          const maxDepth = 10;
          const seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;

          function deep(cur, depth) {
            if (steps++ > maxSteps) return null;
            if (depth < 0 || !cur) return null;

            cur = resolveById(cur);

            if (Array.isArray(cur)) {
              for (const item of cur) {
                const r = deep(item, depth - 1);
                if (r) return r;
              }
              return null;
            }

            if (typeof cur !== "object") return null;
            if (seen) {
              if (seen.has(cur)) return null;
              seen.add(cur);
            }

            if (includesRecipeType(cur["@type"])) return cur;

            // First check the most common properties that "contain" the recipe node.
            if (cur.mainEntity) {
              const r = deep(cur.mainEntity, depth - 1);
              if (r) return r;
            }
            if (cur.itemListElement) {
              const r = deep(cur.itemListElement, depth - 1);
              if (r) return r;
            }
            if (cur.hasPart) {
              const r = deep(cur.hasPart, depth - 1);
              if (r) return r;
            }

            const priorityKeys = [
              "suggestedRecipe",
              "recipe",
              "object",
              "item",
              "mentions",
              "about",
              "mainEntityOfPage",
              "@graph",
              "isPartOf",
              "partOf",
            ];
            for (const k of priorityKeys) {
              if (cur[k] === undefined) continue;
              const r = deep(cur[k], depth - 1);
              if (r) return r;
            }

            // Fallback: traverse any nested objects/arrays.
            for (const [, v] of Object.entries(cur)) {
              if (!v || (typeof v !== "object" && !Array.isArray(v))) continue;
              const r = deep(v, depth - 1);
              if (r) return r;
            }

            return null;
          }

          return deep(root, maxDepth);
        }

        for (const node of nodes) {
          const recipe = deepFindRecipe(node);
          if (recipe) return { recipe, url: window.location.href };
        }
      } catch {}
    }

    // DOM fallback for pages that don't provide a schema.org Recipe JSON-LD node
    // (common: Yoast output only has WebPage/ImageObject/etc).
    try {
      function parseNumberLoose(raw) {
        const normalized = String(raw).trim().replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
      }

      function normalizeUnit(unitRaw) {
        const u = String(unitRaw || "")
          .trim()
          .toLowerCase()
          .replace(/\(s\)\s*$/i, "")
          .replace(/[.]+$/g, "");

        const unitMap = {
          tablespoon: "tbsp",
          tbs: "tbsp",
          tbsp: "tbsp",
          tsp: "tsp",
          teaspoon: "tsp",
          kilo: "kg",
          kilogram: "kg",
          gram: "g",
          milliliter: "ml",
          liter: "l",
          litre: "l",
          clove: "clove",
          piece: "piece",
          pinch: "pinch",
          bunch: "bunch",
          can: "can",
          package: "package",
          ounce: "oz",
          lb: "lb",
          pound: "lb",
        };

        return unitMap[u] ?? u ?? null;
      }

      function parseIngredientLine(rawLine) {
        const line = String(rawLine || "").replace(/\s+/g, " ").trim();
        if (!line) return null;

        // Common patterns:
        // "2-3 tablespoon(s) olive oil"
        // "1,5 kilo ossobuco"
        // "1 clove(s) of garlic"
        // "lemon juice"
        const m = line.match(/^(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s+(.+)$/);

        // No leading quantity => whole line is item
        if (!m) {
          return { item: line, quantityMin: null, quantityMax: null, unit: null };
        }

        const qty1 = parseNumberLoose(m[1]);
        const qty2 = m[2] ? parseNumberLoose(m[2]) : null;
        const rest = m[3].trim(); // "unit item..."

        if (qty1 == null) return null;

        const restParts = rest.split(" ").filter(Boolean);
        const unitCandidate = restParts.shift() ?? "";
        const itemRemainder = restParts.join(" ").trim();

        // If we couldn't identify an item after unit, treat unitCandidate as item.
        if (!itemRemainder) {
          return {
            item: unitCandidate,
            quantityMin: qty2 == null ? qty1 : qty1,
            quantityMax: qty2 == null ? qty1 : qty2,
            unit: null,
          };
        }

        const item = itemRemainder.startsWith("of ") ? itemRemainder.slice(3).trim() : itemRemainder;
        const unit = normalizeUnit(unitCandidate);

        return {
          item,
          quantityMin: qty2 == null ? qty1 : qty1,
          quantityMax: qty2 == null ? qty1 : qty2,
          unit,
        };
      }

      function parseQuickNumber(text, re) {
        const m = String(text || "").match(re);
        if (!m) return null;
        const n = parseNumberLoose(m[1]);
        return n == null ? null : Math.round(n);
      }

      const titleEl = document.querySelector("h1.entry-title") || document.querySelector("h1");
      const title = titleEl?.textContent?.replace(/\s+/g, " ").trim() || null;

      const quickInfoEl = document.querySelector(".entry-quick-info");
      const quickText = quickInfoEl?.textContent || "";
      const servings = parseQuickNumber(quickText, /Serves:\s*(\d+(?:[.,]\d+)?)/i);
      const cookTimeMin = parseQuickNumber(quickText, /Cooks in:\s*(\d+(?:[.,]\d+)?)/i);

      const imageMeta = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
      const thumbImg = document.querySelector(".entry-thumbnail img")?.getAttribute("src");
      const image = [imageMeta, thumbImg].filter((x) => typeof x === "string" && x.trim().length > 0);

      const ingredientsContainer = document.querySelector(".recipe-ingredients");
      const ingredientParas = ingredientsContainer ? Array.from(ingredientsContainer.querySelectorAll("p")) : [];
      const ingredients = ingredientParas
        .map((p) => p.textContent.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .filter((line) => {
          const lower = line.toLowerCase();
          if (lower === "garnish") return false;
          if (lower === "ingredients") return false;
          if (lower === "method") return false;
          return true;
        })
        .map((line) => parseIngredientLine(line))
        .filter(Boolean);

      const methodContainer = document.querySelector(".recipe-method");
      const methodParas = methodContainer ? Array.from(methodContainer.querySelectorAll("p")) : [];
      const instructions = methodParas
        .map((p) => p.textContent.replace(/\s+/g, " ").trim())
        .filter(Boolean);

      const hasCore = Boolean(title) && (ingredients.length > 0 || instructions.length > 0);
      if (!hasCore) return null;

      const recipe = {
        sourceUrl: "",
        title: title || undefined,
        ingredients,
        instructions,
        servings,
        cookTimeMin,
        image: image.length > 0 ? image : undefined,
      };

      return { recipe, url: window.location.href };
    } catch {}

    return null;
  };
}

/** Injected to collect debug info when extraction fails */
function getDebugScript() {
  return function () {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const scriptsCount = scripts.length;
    const parts = [];
    const typesSeen = [];
    let deepRecipeFound = false;
    let deepRecipeInfo = null;
    let parseError = null;
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const raw = (script.textContent || "").trim();
      try {
        const data = JSON.parse(raw);
        const nodes = Array.isArray(data)
          ? data
          : data && data["@graph"]
            ? data["@graph"]
            : data
              ? [data]
              : [];
        parts.push("script " + (i + 1) + ": " + nodes.length + " node(s)");

        // Build an @id -> node index for reference resolving.
        const nodesById = {};
        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          const id = node["@id"];
          if (typeof id === "string" && id) nodesById[id] = node;
        }

        function includesRecipeType(t) {
          const arr = Array.isArray(t) ? t : t ? [t] : [];
          return arr
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes("recipe"));
        }

        function resolveById(obj) {
          if (!obj || typeof obj !== "object") return obj;
          const id = obj["@id"];
          if (typeof id === "string" && id && nodesById[id]) return nodesById[id];
          return obj;
        }

        function deepFindRecipe(root) {
          let steps = 0;
          const maxSteps = 20000;
          const maxDepth = 10;
          const seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;

          function deep(cur, depth) {
            if (steps++ > maxSteps) return null;
            if (depth < 0 || !cur) return null;
            cur = resolveById(cur);

            if (Array.isArray(cur)) {
              for (const item of cur) {
                const r = deep(item, depth - 1);
                if (r) return r;
              }
              return null;
            }
            if (typeof cur !== "object") return null;

            if (seen) {
              if (seen.has(cur)) return null;
              seen.add(cur);
            }

            if (includesRecipeType(cur["@type"])) return cur;

            if (cur.mainEntity) {
              const r = deep(cur.mainEntity, depth - 1);
              if (r) return r;
            }
            if (cur.itemListElement) {
              const r = deep(cur.itemListElement, depth - 1);
              if (r) return r;
            }
            if (cur.hasPart) {
              const r = deep(cur.hasPart, depth - 1);
              if (r) return r;
            }

            const priorityKeys = [
              "suggestedRecipe",
              "recipe",
              "object",
              "item",
              "mentions",
              "about",
              "mainEntityOfPage",
              "@graph",
              "isPartOf",
              "partOf",
            ];
            for (const k of priorityKeys) {
              if (cur[k] === undefined) continue;
              const r = deep(cur[k], depth - 1);
              if (r) return r;
            }

            for (const [, v] of Object.entries(cur)) {
              if (!v || (typeof v !== "object" && !Array.isArray(v))) continue;
              const r = deep(v, depth - 1);
              if (r) return r;
            }
            return null;
          }

          return deep(root, maxDepth);
        }

        for (const node of nodes) {
          const t = node["@type"];
          const types = Array.isArray(t) ? t : t ? [String(t)] : [];
          types.forEach((x) => typesSeen.push(x));
        }

        for (const node of nodes) {
          const recipe = deepFindRecipe(node);
          if (recipe) {
            deepRecipeFound = true;
            deepRecipeInfo = {
              scriptIndex: i + 1,
              foundType: recipe["@type"],
              foundId: recipe["@id"] || null,
              foundName: recipe.name || null,
            };
            parts.push(
              "script " + (i + 1) + ": deep found recipe (" + JSON.stringify(recipe["@type"]) + ")"
            );
            break;
          }
        }
      } catch (e) {
        parseError = e.message || String(e);
        parts.push("script " + (i + 1) + ": parse error " + parseError);
      }
    }
    let summary =
      scriptsCount === 0
        ? "No application/ld+json scripts found."
        : parts.join("; ") + ". Types: " + [...new Set(typesSeen)].join(", ") + (deepRecipeFound ? ". Deep search found a Recipe node." : ". Deep search found no Recipe node.");
    return {
      scriptsCount,
      summary,
      detail: JSON.stringify(
        { scriptsCount, parts, typesSeen: [...new Set(typesSeen)], deepRecipeFound, deepRecipeInfo, parseError },
        null,
        2
      ),
    };
  };
}

/** Injected to log the same debug info to the page's console (DevTools on the recipe tab). */
function getDebugConsoleScript() {
  return function () {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    console.group("[Recipe Book Importer] JSON-LD debug");
    console.log("Scripts found:", scripts.length);
    scripts.forEach((script, i) => {
      try {
        const data = JSON.parse(script.textContent || "null");
        const nodes = Array.isArray(data)
          ? data
          : data && data["@graph"]
            ? data["@graph"]
            : data
              ? [data]
              : [];
        console.log("Script " + (i + 1) + " – nodes:", nodes.length, nodes.map((n) => n["@type"]));
        nodes.forEach((n) => {
          if (n.mainEntity) {
            console.log("  → mainEntity @type:", n.mainEntity["@type"], n.mainEntity);
          }
        });

        // Deep-find recipe and log it if we can.
        const nodesById = {};
        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          const id = node["@id"];
          if (typeof id === "string" && id) nodesById[id] = node;
        }
        function includesRecipeType(t) {
          const arr = Array.isArray(t) ? t : t ? [t] : [];
          return arr.filter(Boolean).some((x) => String(x).toLowerCase().includes("recipe"));
        }
        function resolveById(obj) {
          if (!obj || typeof obj !== "object") return obj;
          const id = obj["@id"];
          if (typeof id === "string" && id && nodesById[id]) return nodesById[id];
          return obj;
        }

        function deepFindRecipe(root) {
          let steps = 0;
          const maxSteps = 20000;
          const maxDepth = 10;
          const seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;

          function deep(cur, depth) {
            if (steps++ > maxSteps) return null;
            if (depth < 0 || !cur) return null;
            cur = resolveById(cur);
            if (Array.isArray(cur)) {
              for (const item of cur) {
                const r = deep(item, depth - 1);
                if (r) return r;
              }
              return null;
            }
            if (typeof cur !== "object") return null;
            if (seen) {
              if (seen.has(cur)) return null;
              seen.add(cur);
            }
            if (includesRecipeType(cur["@type"])) return cur;
            if (cur.mainEntity) {
              const r = deep(cur.mainEntity, depth - 1);
              if (r) return r;
            }
            if (cur.itemListElement) {
              const r = deep(cur.itemListElement, depth - 1);
              if (r) return r;
            }
            if (cur.hasPart) {
              const r = deep(cur.hasPart, depth - 1);
              if (r) return r;
            }

            const priorityKeys = [
              "suggestedRecipe",
              "recipe",
              "object",
              "item",
              "mentions",
              "about",
              "mainEntityOfPage",
              "@graph",
              "isPartOf",
              "partOf",
            ];
            for (const k of priorityKeys) {
              if (cur[k] === undefined) continue;
              const r = deep(cur[k], depth - 1);
              if (r) return r;
            }
            for (const [, v] of Object.entries(cur)) {
              if (!v || (typeof v !== "object" && !Array.isArray(v))) continue;
              const r = deep(v, depth - 1);
              if (r) return r;
            }
            return null;
          }

          return deep(root, maxDepth);
        }

        for (const node of nodes) {
          const recipe = deepFindRecipe(node);
          if (recipe) {
            console.log("  → deep found Recipe node:", {
              type: recipe["@type"],
              id: recipe["@id"] || null,
              name: recipe.name || null,
            });
            break;
          }
        }
      } catch (e) {
        console.log("Script " + (i + 1) + " – parse error:", e.message);
      }
    });
    console.groupEnd();
  };
}

let lastResult = null;

extractBtn.addEventListener("click", async () => {
  showMessage("");
  showMeta("");
  copyBtn.disabled = true;
  sendBtn.disabled = true;
  lastResult = null;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showMessage("No active tab.", "error");
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getExtractScript(),
    });
    const value = results?.[0]?.result;
    if (!value?.recipe) {
      // Run debug script and show why extraction failed
      try {
        const debugResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getDebugScript(),
        });
        const debug = debugResults?.[0]?.result;
        if (debug) {
          const summary = `Scripts: ${debug.scriptsCount}. ${debug.summary}`;
          showMeta(summary);
          metaEl.title = debug.detail || "";
        }
      } catch {}
      showMessage("No JSON-LD Recipe found on this page.", "error");
      return;
    }
    lastResult = value;
    copyBtn.disabled = false;
    sendBtn.disabled = false;
    showMeta(value.recipe.name || "Recipe extracted.");
    showMessage("Recipe extracted. Copy or send to Recipe Book.", "success");
  } catch {
    showMessage("Cannot read this page (e.g. chrome:// or extension page).", "error");
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastResult?.recipe) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastResult.recipe, null, 2));
    showMessage("Copied to clipboard.", "success");
  } catch {
    showMessage("Copy failed.", "error");
  }
});

debugBtn.addEventListener("click", async () => {
  showMessage("");
  showMeta("");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showMessage("No active tab.", "error");
    return;
  }
  try {
    const [debugResults, _] = await Promise.all([
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getDebugScript() }),
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getDebugConsoleScript() }),
    ]);
    const debug = debugResults?.[0]?.result;
    if (!debug) {
      showMessage("Debug failed (e.g. chrome:// page).", "error");
      return;
    }
    showMeta(debug.summary);
    metaEl.title = debug.detail || "";
    showMessage("Summary below. Open DevTools (F12) on this tab to see debug in the page console.", "success");
  } catch (e) {
    showMessage("Cannot run on this page: " + (e?.message || e), "error");
  }
});

sendBtn.addEventListener("click", async () => {
  if (!lastResult?.recipe || !lastResult?.url) return;
  const base = (apiBaseInput.value || "http://localhost:3000").replace(/\/$/, "");
  const parseUrl = `${base}/api/parse-recipe`;
  const createUrl = `${base}/api/create-recipe`;
  sendBtn.disabled = true;
  showMessage("Sending…");

  try {
    const parseRes = await fetch(parseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: lastResult.url,
        recipe: lastResult.recipe,
      }),
    });

    const parsedData = await parseRes.json().catch(() => ({}));
    if (!parseRes.ok) {
      showMessage(parsedData?.error || `Error ${parseRes.status}`, "error");
      sendBtn.disabled = false;
      return;
    }

    const recipe = parsedData?.recipe;
    if (!recipe) {
      showMessage("Parse succeeded but no `recipe` payload returned.", "error");
      sendBtn.disabled = false;
      return;
    }

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: lastResult.url,
        recipe,
      }),
    });

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      showMessage(createData?.error || `Error ${createRes.status}`, "error");
      sendBtn.disabled = false;
      return;
    }

    const updated = createData?.updated === true;
    showMessage(
      updated ? "Recipe updated in Studio." : "Created in Studio. Open /studio to see it.",
      "success"
    );
    chrome.storage.local.set({ [STORAGE_KEY]: base });
  } catch {
    showMessage("Request failed. Is the app running at " + base + "?", "error");
  } finally {
    sendBtn.disabled = false;
  }
});
