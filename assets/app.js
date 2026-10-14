/* Guide Hub — shared code for every page.
   All content lives in /data. You normally never need to edit this file. */

const Hub = {
  _cache: {},

  async json(path) {
    if (!this._cache[path]) {
      this._cache[path] = fetch(path, { cache: "no-cache" }).then(r => {
        if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
        return r.json();
      });
    }
    return this._cache[path];
  },
  site() { return this.json("data/site.json"); },
  gamesData() { return this.json("data/games.json"); },
  async games() { return (await this.gamesData()).games || []; },
  async game(id) { return (await this.games()).find(g => g.id === id); },
  async guides(gameId) {
    try { return await this.json(`data/guides/${gameId}.json`); }
    catch { return []; }
  },
  async allGuides() {
    const games = await this.games();
    const lists = await Promise.all(games.map(g => this.guides(g.id)));
    return games.flatMap((g, i) => lists[i].map(x => ({ ...x, game: g })));
  },

  /* Accepts any YouTube link format, or a bare 11-character ID. */
  ytId(url) {
    if (!url) return "";
    url = String(url).trim();
    if (/^[\w-]{11}$/.test(url)) return url;
    const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/|\/v\/)([\w-]{11})/);
    return m ? m[1] : "";
  },
  ytStart(url) {
    const m = String(url || "").match(/[?&](?:t|start)=(\d+h)?(\d+m)?(\d+)s?/);
    if (!m) return 0;
    return (parseInt(m[1]) || 0) * 3600 + (parseInt(m[2]) || 0) * 60 + (parseInt(m[3]) || 0);
  },
  thumb(url) { const id = this.ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ""; },

  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },
  param(k) { return new URLSearchParams(location.search).get(k); },
  fmtDate(d) {
    if (!d) return "";
    const t = new Date(d + "T00:00:00");
    return isNaN(t) ? d : t.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  },
  slug(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60); },

  setAccent(color) { if (color) document.documentElement.style.setProperty("--accent", color); },

  /* Story order first (entries with "order"), then newest. */
  sortGuides(list, mode = "order") {
    const byDate = (a, b) => (b.date || "").localeCompare(a.date || "");
    if (mode === "newest") return [...list].sort(byDate);
    if (mode === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return [...list].sort((a, b) => {
      const ao = a.order ?? Infinity, bo = b.order ?? Infinity;
      return ao !== bo ? ao - bo : byDate(a, b);
    });
  },

  guideUrl(gameId, guideId) { return `guide.html?game=${encodeURIComponent(gameId)}&id=${encodeURIComponent(guideId)}`; },

  guideCard(g, gameId, opts = {}) {
    const t = this.thumb(g.video);
    const img = t ? `<img src="${t}" alt="" loading="lazy"><span class="play"></span>` : `<div class="ph">Video coming soon</div>`;
    const order = opts.showOrder && g.order != null ? `<span class="order">#${this.esc(g.order)}</span>` : "";
    const gameLabel = opts.gameName ? `<span>${this.esc(opts.gameName)}</span>` : "";
    return `<a class="guide-card" href="${this.guideUrl(gameId, g.id)}">
      <div class="thumb">${img}${order}</div>
      <div class="body">
        <span><span class="badge">${this.esc(g.type || "Guide")}</span></span>
        <h3>${this.esc(g.title)}</h3>
        <div class="meta">${gameLabel}${g.location ? `<span>📍 ${this.esc(g.location)}</span>` : ""}${g.date ? `<span>${this.fmtDate(g.date)}</span>` : ""}</div>
      </div></a>`;
  },

  socialLinks(socials = {}) {
    const labels = { youtube: "YouTube", kofi: "Ko-fi", discord: "Discord", twitch: "Twitch", facebook: "Facebook", tiktok: "TikTok", x: "X" };
    return Object.entries(socials).filter(([, url]) => url)
      .map(([k, url]) => `<a class="chip" href="${this.esc(url)}" target="_blank" rel="noopener">${labels[k] || this.esc(k)}</a>`).join("");
  },

  async chrome(active) {
    const site = await this.site();
    const initial = (site.channelName || "G").trim()[0].toUpperCase();
    document.title = document.title ? `${document.title} · ${site.channelName}` : site.channelName;
    const head = document.getElementById("site-header");
    if (head) head.outerHTML = `<header class="site-header"><div class="wrap">
      <a class="brand" href="./"><span class="brand-mark">${this.esc(initial)}</span><span>${this.esc(site.channelName)}</span></a>
      <nav class="nav">
        <a href="./#games" class="${active === "games" ? "active" : ""}">Games</a>
        <a href="./#latest" class="hide-sm">Latest</a>
        ${site.socials?.youtube ? `<a href="${this.esc(site.socials.youtube)}" target="_blank" rel="noopener">YouTube ↗</a>` : ""}
      </nav></div></header>`;
    const foot = document.getElementById("site-footer");
    if (foot) foot.outerHTML = `<footer class="site-footer"><div class="wrap">
      <span>© ${new Date().getFullYear()} ${this.esc(site.channelName)}. Game names and art belong to their owners.</span>
      <div class="socials">${this.socialLinks(site.socials)}</div></div></footer>`;
    return site;
  },

  /* ---------- maps (Leaflet, image-based) ---------- */
  loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Map image not found: " + src)); i.src = src; });
  },
  toLatLng([x, y]) { return [-y, x]; },
  fromLatLng(ll) { return [Math.round(ll.lng), Math.round(-ll.lat)]; },
  pinIcon(type) {
    const cls = /boss/i.test(type || "") ? "hub-pin boss" : "hub-pin";
    return L.divIcon({ className: "", html: `<div class="${cls}"></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -26] });
  },
  async makeMap(el, mapDef, { interactive = true } = {}) {
    const img = await this.loadImg(mapDef.image);
    const w = img.naturalWidth || 1600, h = img.naturalHeight || 1000;
    const bounds = [[-h, 0], [0, w]];
    const map = L.map(el, { crs: L.CRS.Simple, minZoom: -5, maxZoom: 3, zoomSnap: 0.25, attributionControl: false, scrollWheelZoom: interactive });
    L.imageOverlay(mapDef.image, bounds).addTo(map);
    map.fitBounds(bounds);
    map.setMinZoom(map.getZoom() - 0.5);
    map.setMaxBounds(L.latLngBounds(bounds).pad(0.25));
    map.hubSize = { w, h };
    return map;
  },

  showError(el, err) {
    console.error(err);
    el.innerHTML = `<div class="empty">Something went wrong loading this page.<br><small>${this.esc(err.message)}</small></div>`;
  },
};

/* ===================== PAGES ===================== */

async function initHome() {
  const site = await Hub.chrome("games");
  document.getElementById("hero-title").textContent = site.channelName;
  document.getElementById("hero-tagline").textContent = site.tagline || "";
  if (site.socials?.youtube) {
    const b = document.getElementById("subscribe");
    b.href = site.socials.youtube.replace(/\/$/, "") + (site.socials.youtube.includes("@") ? "?sub_confirmation=1" : "");
    b.classList.remove("hidden");
  }
  if (site.socials?.kofi) {
    const k = document.getElementById("kofi");
    k.href = site.socials.kofi; k.classList.remove("hidden");
  }
  const games = await Hub.games();
  const all = await Hub.allGuides();
  const counts = Object.fromEntries(games.map(g => [g.id, all.filter(x => x.game.id === g.id).length]));

  document.getElementById("game-grid").innerHTML = games.length ? games.map(g => `
    <a class="game-card" href="game.html?game=${encodeURIComponent(g.id)}" style="--card-accent:${Hub.esc(g.accent || "")}">
      <img class="cover" src="${Hub.esc(g.cover || "")}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="body"><h3>${Hub.esc(g.name)}</h3><p>${Hub.esc(g.tagline || "")}</p>
      <div class="count">${counts[g.id]} guide${counts[g.id] === 1 ? "" : "s"}</div></div></a>`).join("")
    : `<div class="empty">No games yet. Add one in data/games.json.</div>`;

  const latestEl = document.getElementById("latest-grid");
  const renderList = list => list.length
    ? list.map(x => Hub.guideCard(x, x.game.id, { gameName: x.game.name })).join("")
    : `<div class="empty">${all.length ? "No guides match your search." : "First guides coming soon."}</div>`;
  const latest = Hub.sortGuides(all, "newest").slice(0, 8);
  latestEl.innerHTML = renderList(latest);

  const search = document.getElementById("search");
  const latestHead = document.getElementById("latest-title");
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    if (!q) { latestHead.textContent = "Latest guides"; latestEl.innerHTML = renderList(latest); return; }
    const hits = all.filter(x => [x.title, x.type, x.location, x.game.name, x.notes].join(" ").toLowerCase().includes(q));
    latestHead.textContent = `Results for “${search.value.trim()}” (${hits.length})`;
    latestEl.innerHTML = renderList(Hub.sortGuides(hits, "newest"));
  });
}

async function initGame() {
  await Hub.chrome("games");
  const main = document.getElementById("main");
  const id = Hub.param("game");
  const game = await Hub.game(id);
  if (!game) { main.innerHTML = `<div class="wrap"><div class="empty" style="margin-top:40px">Game not found. <a href="./">Back to all games</a></div></div>`; return; }
  Hub.setAccent(game.accent);
  document.title = game.name + document.title.slice(document.title.indexOf(" · "));
  const guides = await Hub.guides(game.id);
  const typeOrder = game.guideTypes || (await Hub.gamesData()).guideTypes || [];

  document.getElementById("g-cover").src = game.cover || "";
  document.getElementById("g-name").textContent = game.name;
  document.getElementById("g-crumb").textContent = game.name;
  document.getElementById("g-tagline").textContent = game.tagline || "";
  document.getElementById("g-count").textContent = `${guides.length} guide${guides.length === 1 ? "" : "s"}`;

  // types present in this game, in configured order, then any extras
  const present = [...new Set(guides.map(g => g.type || "Guide"))];
  const types = [...typeOrder.filter(t => present.includes(t)), ...present.filter(t => !typeOrder.includes(t))];

  const state = { type: Hub.param("type") || "All", q: "", sort: "order" };
  const chipsEl = document.getElementById("type-chips");
  const listEl = document.getElementById("guide-list");

  const renderChips = () => {
    chipsEl.innerHTML = ["All", ...types].map(t => {
      const n = t === "All" ? guides.length : guides.filter(g => (g.type || "Guide") === t).length;
      return `<button class="chip ${state.type === t ? "on" : ""}" data-type="${Hub.esc(t)}">${Hub.esc(t)} <span class="n">${n}</span></button>`;
    }).join("");
  };
  const render = () => {
    renderChips();
    const q = state.q.toLowerCase();
    let list = guides.filter(g => (state.type === "All" || (g.type || "Guide") === state.type) &&
      (!q || [g.title, g.location, g.notes].join(" ").toLowerCase().includes(q)));
    if (!list.length) { listEl.innerHTML = `<div class="empty">${guides.length ? "No guides match your filter." : "No guides for this game yet — check back soon."}</div>`; return; }
    if (state.type === "All" && !q && state.sort === "order") {
      // group by guide type
      listEl.innerHTML = types.map(t => {
        const items = Hub.sortGuides(list.filter(g => (g.type || "Guide") === t), "order");
        return items.length ? `<div class="group-title">${Hub.esc(t)}</div><div class="guide-grid">${items.map(g => Hub.guideCard(g, game.id, { showOrder: true })).join("")}</div>` : "";
      }).join("");
    } else {
      listEl.innerHTML = `<div class="guide-grid">${Hub.sortGuides(list, state.sort).map(g => Hub.guideCard(g, game.id, { showOrder: state.sort === "order" })).join("")}</div>`;
    }
  };
  chipsEl.addEventListener("click", e => {
    const b = e.target.closest("[data-type]"); if (!b) return;
    state.type = b.dataset.type;
    const u = new URL(location); state.type === "All" ? u.searchParams.delete("type") : u.searchParams.set("type", state.type);
    history.replaceState(null, "", u);
    render();
  });
  document.getElementById("g-search").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
  document.getElementById("g-sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  render();

  // ---- map tab ----
  const maps = game.maps || [];
  const tabs = document.getElementById("tabs");
  if (!maps.length) { tabs.classList.add("hidden"); return; }
  let mapReady = false, map, layer;
  const mapSelect = document.getElementById("map-select");
  mapSelect.innerHTML = maps.map(m => `<option value="${Hub.esc(m.id)}">${Hub.esc(m.name)}</option>`).join("");
  if (maps.length < 2) mapSelect.classList.add("hidden");

  const drawMap = async mapId => {
    const def = maps.find(m => m.id === mapId) || maps[0];
    const box = document.getElementById("map-box");
    if (map) { map.remove(); map = null; }
    box.innerHTML = "";
    try { map = await Hub.makeMap(box, def); } catch (err) { Hub.showError(box, err); return; }
    layer = L.layerGroup().addTo(map);
    const pinned = guides.filter(g => g.pin && (g.map || maps[0].id) === def.id);
    pinned.forEach(g => {
      L.marker(Hub.toLatLng(g.pin), { icon: Hub.pinIcon(g.type), title: g.title }).addTo(layer)
        .bindPopup(`<span class="badge">${Hub.esc(g.type || "Guide")}</span><b>${Hub.esc(g.title)}</b>${g.location ? `<div class="muted">📍 ${Hub.esc(g.location)}</div>` : ""}<div style="margin-top:8px"><a href="${Hub.guideUrl(game.id, g.id)}">Open guide →</a></div>`);
    });
    document.getElementById("map-count").textContent = `${pinned.length} pinned location${pinned.length === 1 ? "" : "s"}`;
  };
  mapSelect.addEventListener("change", () => drawMap(mapSelect.value));

  tabs.addEventListener("click", async e => {
    const b = e.target.closest("button[data-tab]"); if (!b) return;
    tabs.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    const showMap = b.dataset.tab === "map";
    document.getElementById("panel-guides").classList.toggle("hidden", showMap);
    document.getElementById("panel-map").classList.toggle("hidden", !showMap);
    const u = new URL(location); showMap ? u.searchParams.set("view", "map") : u.searchParams.delete("view"); history.replaceState(null, "", u);
    if (showMap && !mapReady) { mapReady = true; await drawMap(mapSelect.value); }
    else if (showMap && map) map.invalidateSize();
  });
  if (Hub.param("view") === "map") tabs.querySelector('[data-tab="map"]').click();
}

async function initGuide() {
  await Hub.chrome("games");
  const main = document.getElementById("main");
  const game = await Hub.game(Hub.param("game"));
  const guides = game ? await Hub.guides(game.id) : [];
  const g = guides.find(x => x.id === Hub.param("id"));
  if (!game || !g) { main.innerHTML = `<div class="wrap"><div class="empty" style="margin-top:40px">Guide not found. <a href="./">Back to all games</a></div></div>`; return; }
  Hub.setAccent(game.accent);
  document.title = g.title + document.title.slice(document.title.indexOf(" · "));

  const gameLink = document.getElementById("crumb-game");
  gameLink.textContent = game.name; gameLink.href = `game.html?game=${encodeURIComponent(game.id)}`;
  const typeLink = document.getElementById("crumb-type");
  typeLink.textContent = g.type || "Guide"; typeLink.href = `game.html?game=${encodeURIComponent(game.id)}&type=${encodeURIComponent(g.type || "Guide")}`;
  document.getElementById("g-title").textContent = g.title;
  document.getElementById("g-badge").textContent = g.type || "Guide";

  const vid = Hub.ytId(g.video);
  const video = document.getElementById("video");
  if (vid) {
    const start = Hub.ytStart(g.video);
    video.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0${start ? "&start=" + start : ""}" title="${Hub.esc(g.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    const yt = document.getElementById("yt-link");
    yt.href = `https://www.youtube.com/watch?v=${vid}${start ? "&t=" + start + "s" : ""}`; yt.classList.remove("hidden");
  } else {
    video.innerHTML = `<div class="ph">Video coming soon</div>`;
  }

  const notes = document.getElementById("notes");
  if (g.notes && g.notes.trim()) {
    notes.innerHTML = g.notes.trim().split(/\n+/).map(p => `<p>${Hub.esc(p)}</p>`).join("");
  } else document.getElementById("notes-panel").classList.add("hidden");

  const kv = [["Game", Hub.esc(game.name)], ["Type", Hub.esc(g.type || "Guide")]];
  if (g.location) kv.push(["Location", Hub.esc(g.location)]);
  if (g.order != null) kv.push(["Part", "#" + Hub.esc(g.order)]);
  if (g.date) kv.push(["Posted", Hub.fmtDate(g.date)]);
  document.getElementById("details").innerHTML = kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");

  // prev / next within same type
  const same = Hub.sortGuides(guides.filter(x => (x.type || "Guide") === (g.type || "Guide")), "order");
  const i = same.findIndex(x => x.id === g.id);
  const pn = [];
  if (same[i - 1]) pn.push(`<a class="prev" href="${Hub.guideUrl(game.id, same[i - 1].id)}"><small>← Previous</small>${Hub.esc(same[i - 1].title)}</a>`);
  if (same[i + 1]) pn.push(`<a class="next" href="${Hub.guideUrl(game.id, same[i + 1].id)}"><small>Next →</small>${Hub.esc(same[i + 1].title)}</a>`);
  document.getElementById("prevnext").innerHTML = pn.join("");

  // mini map
  const maps = game.maps || [];
  const def = maps.find(m => m.id === g.map) || maps[0];
  const panel = document.getElementById("map-panel");
  if (!def || !g.pin) { panel.classList.add("hidden"); return; }
  document.getElementById("map-name").textContent = def.name;
  document.getElementById("full-map").href = `game.html?game=${encodeURIComponent(game.id)}&view=map`;
  try {
    const map = await Hub.makeMap(document.getElementById("mini-map"), def, { interactive: false });
    const ll = Hub.toLatLng(g.pin);
    L.marker(ll, { icon: Hub.pinIcon(g.type) }).addTo(map);
    map.setView(ll, Math.min(map.getZoom() + 1.5, 1));
  } catch (err) { Hub.showError(document.getElementById("mini-map"), err); }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  const fn = { home: initHome, game: initGame, guide: initGuide }[page];
  if (fn) fn().catch(err => Hub.showError(document.getElementById("main") || document.body, err));
});
