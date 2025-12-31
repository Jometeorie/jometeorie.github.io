async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.json();
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  // For attribute contexts; escapeHTML already covers basic needs.
  return escapeHTML(s);
}

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function buildNewsItem(item) {
  const date = escapeHTML(item.date || "");
  const icon = escapeHTML(item.icon || "");
  const text = escapeHTML(item.text || "");

  const prefix = icon ? `${icon} ` : "";
  return `<li><span class="date">${date}</span><span class="text">${prefix}${text}</span></li>`;
}

async function initNews() {
  const listEl = document.getElementById("news-list");
  if (!listEl) return;

  try {
    const data = await loadJSON("./data/news.json");
    const items = Array.isArray(data) ? data : data.items || [];
    if (!items.length) {
      listEl.innerHTML = `<li class="muted small">No news yet.</li>`;
      return;
    }
    // Keep JSON order so users can manually reorder.
    listEl.innerHTML = items.map(buildNewsItem).join("");
  } catch (e) {
    listEl.innerHTML = `<li class="muted small">Failed to load news.</li>`;
  }
}

function isFirstAuthor(pub) {
  if (typeof pub.first_author === "boolean") return pub.first_author;
  const authors = String(pub.authors || "");
  const first = authors.split(",")[0]?.trim().toLowerCase();
  return (
    first === "t ju" ||
    first === "tianjie ju" ||
    first === "ju t" ||
    (first && first.includes("t ju")) ||
    (first && first.includes("tianjie ju"))
  );
}

function statusRank(pub) {
  if (typeof pub.status_rank === "number") return pub.status_rank;
  const v = norm(pub.venue);
  if (v.includes("accepted") || v.includes("to appear")) return 2;
  if (v.includes("arxiv")) return 0;
  return v ? 1 : 0;
}

function isPinned(pub) {
  return pub && pub.pinned === true;
}

function orderHint(pub) {
  const v = Number(pub?.order_hint || 0);
  return Number.isFinite(v) ? v : 0;
}

function normalizeAuthors(authors) {
  let s = String(authors || "");
  // Normalize Tianjie Ju name variants
  s = s.replaceAll("鞠天杰", "Tianjie Ju");
  s = s.replaceAll("T Ju", "Tianjie Ju");
  s = s.replaceAll("Ju T", "Tianjie Ju");
  // Normalize comma spacing
  s = s.replace(/\s+,/g, ",");
  s = s.replace(/,\s*/g, ", ");
  return s.trim();
}

function normalizeVenue(venue) {
  let v = String(venue || "").trim();
  // Remove trailing ", 2025" etc to avoid duplication with the year tag
  v = v.replace(/,\s*(19|20)\d{2}\s*$/g, "");
  return v.trim();
}

function highlightMe(escapedAuthors) {
  // escapedAuthors is already HTML-escaped, so replacement is safe.
  return escapedAuthors.replaceAll(
    "Tianjie Ju",
    '<span class="author-me">Tianjie Ju</span>',
  );
}

function buildPubCard(pub) {
  const title = escapeHTML(pub.title || "Untitled");
  const authors = highlightMe(escapeHTML(normalizeAuthors(pub.authors || "")));
  const venue = escapeHTML(normalizeVenue(pub.venue || ""));
  const year = escapeHTML(pub.year || "");
  const kind = escapeHTML(pub.kind || "");

  const tags = [];
  if (kind) tags.push(`<span class="tag">${kind}</span>`);
  if (venue) tags.push(`<span class="tag">${venue}</span>`);
  // For Working in Progress, keep an explicit year tag to show time.
  if (norm(pub.venue) === "working in progress" && year) tags.push(`<span class="tag">${year}</span>`);

  const links = [];
  if (pub.links?.paper) {
    links.push(
      `<a class="chip" href="${escapeHTML(pub.links.paper)}" target="_blank" rel="noreferrer">
        <span class="btn-icon" aria-hidden="true" data-icon="link"></span> Paper
      </a>`,
    );
  }
  if (pub.links?.pdf) {
    links.push(
      `<a class="chip" href="${escapeHTML(pub.links.pdf)}" target="_blank" rel="noreferrer">
        <span class="btn-icon" aria-hidden="true" data-icon="pdf"></span> PDF
      </a>`,
    );
  }
  if (pub.links?.code) {
    links.push(
      `<a class="chip" href="${escapeHTML(pub.links.code)}" target="_blank" rel="noreferrer">
        <span class="btn-icon" aria-hidden="true" data-icon="code"></span> Code
      </a>`,
    );
  }
  if (pub.links?.project) {
    links.push(
      `<a class="chip" href="${escapeHTML(pub.links.project)}" target="_blank" rel="noreferrer">
        <span class="btn-icon" aria-hidden="true" data-icon="link"></span> Project
      </a>`,
    );
  }

  return `
    <article class="pub-card">
      <div class="pub-top">
        <h3 class="pub-title">${title}</h3>
        <div class="pub-meta">
          <span>${authors}</span>
        </div>
      </div>

      <div class="pub-bottom">
        ${tags.length ? `<div class="pub-tags">${tags.join("")}</div>` : ""}
        ${links.length ? `<div class="pub-links">${links.join("")}</div>` : ""}
      </div>
    </article>
  `;
}

function matchQuery(pub, q) {
  if (!q) return true;
  const hay = [pub.title, pub.authors, pub.venue, pub.kind, pub.year].map(norm).join(" ");
  return hay.includes(q);
}

async function initPublications() {
  const grid = document.getElementById("pub-grid");
  const countEl = document.getElementById("pub-count");
  const queryEl = document.getElementById("pub-query");
  const toggleEl = document.getElementById("pub-toggle");
  if (!grid || !countEl || !queryEl || !toggleEl) return;

  let pubs = [];
  try {
    const data = await loadJSON("./data/publications.json");
    pubs = Array.isArray(data) ? data : data.items || [];
  } catch (e) {
    grid.innerHTML = `<div class="card muted">Failed to load publications. Please check <code>data/publications.json</code>.</div>`;
    countEl.textContent = "0 publications";
    return;
  }
  // IMPORTANT: keep the original order from data/publications.json.
  // Users can manually reorder items in the JSON array.
  const DEFAULT_LIMIT = 10;
  let expanded = false;

  function render() {
    const q = norm(queryEl.value);
    const filtered = pubs.filter((p) => matchQuery(p, q));
    countEl.textContent = `${filtered.length} publication${filtered.length === 1 ? "" : "s"}`;

    const shouldLimit = !expanded && !q && filtered.length > DEFAULT_LIMIT;
    const shown = shouldLimit ? filtered.slice(0, DEFAULT_LIMIT) : filtered;
    grid.innerHTML = shown.map(buildPubCard).join("");

    if (!q && filtered.length > DEFAULT_LIMIT) {
      toggleEl.hidden = false;
      toggleEl.textContent = expanded
        ? "Show less"
        : `Show more (${filtered.length - DEFAULT_LIMIT})`;
    } else {
      toggleEl.hidden = true;
    }

    window.__icons?.initIcons?.();
  }

  toggleEl.addEventListener("click", () => {
    expanded = !expanded;
    render();
  });

  queryEl.addEventListener("input", () => {
    expanded = false;
    render();
  });
  render();
}

function initFooterYear() {
  const el = document.getElementById("year");
  if (!el) return;
  el.textContent = String(new Date().getFullYear());
}

function init() {
  window.__icons?.initIcons?.();
  initNews();
  initPublications();
  initFooterYear();
}

document.addEventListener("DOMContentLoaded", init);


