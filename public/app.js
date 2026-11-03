const $ = (s) => document.querySelector(s);
let wallpapers = [];
let activeCategory = "Todos";
let activeIndex = 0;
let isAdmin = false;

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a ação.");
  return data;
}
function filteredWallpapers() {
  const term = $("#searchInput").value.trim().toLowerCase();
  return wallpapers.filter(w => (activeCategory === "Todos" || w.anime === activeCategory) &&
    (!term || `${w.title} ${w.anime} ${w.description || ""}`.toLowerCase().includes(term)));
}
function renderGallery() {
  const items = filteredWallpapers();
  $("#wallpaperCount").textContent = wallpapers.length;
  $("#animeCount").textContent = new Set(wallpapers.map(w => w.anime)).size;
  $("#resultCount").textContent = `${items.length} IMAGENS`;
  const grid = $("#galleryGrid");
  if (!items.length) {
    grid.innerHTML = wallpapers.length
      ? '<div class="no-results">Nenhum wallpaper encontrado nesta busca.</div>'
      : '<div class="empty-state"><div class="empty-symbol">✦</div><h3>SUA GALERIA COMEÇA AQUI</h3><p>Os wallpapers publicados por você vão aparecer neste espaço.</p><button class="text-btn" id="emptyAdmin">PUBLICAR PRIMEIRA IMAGEM ↗</button></div>';
    $("#emptyAdmin")?.addEventListener("click", openAdmin);
    return;
  }
  grid.innerHTML = items.map((w, i) => `
    <article class="wallpaper-card" data-index="${i}">
      <img class="wallpaper-image" src="${encodeURI(w.image)}" alt="${escapeHTML(w.title)}" loading="lazy">
      <a class="card-download" href="${encodeURI(w.image)}" download title="Baixar wallpaper" aria-label="Baixar ${escapeHTML(w.title)}" onclick="event.stopPropagation()">↓</a>
      <div class="card-shade"></div><div class="card-meta"><div class="card-anime">${escapeHTML(w.anime)}</div><h3 class="card-title">${escapeHTML(w.title)}</h3></div>
    </article>`).join("");
  grid.querySelectorAll(".wallpaper-card").forEach(card => card.addEventListener("click", () => openLightbox(Number(card.dataset.index))));
}
async function loadWallpapers() {
  wallpapers = await api("/api/wallpapers");
  renderGallery();
  renderAdminItems();
}
function openAdmin() {
  $("#adminModal").classList.add("open");
  $("#adminModal").setAttribute("aria-hidden", "false");
}
function closeAdmin() {
  $("#adminModal").classList.remove("open");
  $("#adminModal").setAttribute("aria-hidden", "true");
}
function setAdminMode(value) {
  isAdmin = value;
  $("#loginPanel").hidden = value;
  $("#uploadPanel").hidden = !value;
  if (value) renderAdminItems();
}
function renderAdminItems() {
  $("#adminCount").textContent = wallpapers.length;
  $("#adminItems").innerHTML = wallpapers.length ? wallpapers.map(w => `
    <div class="admin-item"><img src="${encodeURI(w.image)}" alt=""><div><b>${escapeHTML(w.title)}</b><small>${escapeHTML(w.anime)}</small></div><button data-delete="${escapeHTML(w.id)}">EXCLUIR</button></div>`).join("") : '<p class="upload-hint">Você ainda não publicou imagens.</p>';
  $("#adminItems").querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Excluir este wallpaper permanentemente?")) return;
    try { await api(`/api/wallpapers/${btn.dataset.delete}`, { method: "DELETE" }); await loadWallpapers(); }
    catch (e) { alert(e.message); }
  }));
}
function openLightbox(index) {
  const items = filteredWallpapers();
  if (!items.length) return;
  activeIndex = index;
  showLightboxItem();
  $("#lightbox").classList.add("open");
  $("#lightbox").setAttribute("aria-hidden", "false");
}
function showLightboxItem() {
  const item = filteredWallpapers()[activeIndex];
  if (!item) return;
  $("#lightboxImage").src = item.image;
  $("#lightboxImage").alt = item.title;
  $("#lightboxAnime").textContent = item.anime;
  $("#lightboxTitle").textContent = item.title;
  $("#downloadBtn").href = item.image;
  $("#downloadBtn").setAttribute("download", (item.title || "wallpaper").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-") + ".jpg");
}
function moveLightbox(direction) {
  const items = filteredWallpapers();
  if (!items.length) return;
  activeIndex = (activeIndex + direction + items.length) % items.length;
  showLightboxItem();
}
$("#adminOpen").addEventListener("click", openAdmin);
$("#emptyAdmin").addEventListener("click", openAdmin);
$("#modalClose").addEventListener("click", closeAdmin);
$("#adminModal").addEventListener("click", e => { if (e.target === $("#adminModal")) closeAdmin(); });
$("#lightboxClose").addEventListener("click", () => $("#lightbox").classList.remove("open"));
$("#lightbox").addEventListener("click", e => { if (e.target === $("#lightbox")) $("#lightbox").classList.remove("open"); });
$("#lightboxPrev").addEventListener("click", () => moveLightbox(-1));
$("#lightboxNext").addEventListener("click", () => moveLightbox(1));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeAdmin(); $("#lightbox").classList.remove("open"); }
  if ($("#lightbox").classList.contains("open") && e.key === "ArrowRight") moveLightbox(1);
  if ($("#lightbox").classList.contains("open") && e.key === "ArrowLeft") moveLightbox(-1);
});
$("#searchInput").addEventListener("input", renderGallery);
$("#categoryList").addEventListener("click", e => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  activeCategory = btn.dataset.category;
  $("#categoryList").querySelectorAll(".category-chip").forEach(b => b.classList.toggle("active", b === btn));
  renderGallery();
});
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const button = e.currentTarget.querySelector("button");
  button.disabled = true;
  $("#loginMessage").textContent = "";
  const values = Object.fromEntries(new FormData(e.currentTarget));
  try {
    await api("/api/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(values) });
    setAdminMode(true);
    e.currentTarget.reset();
  } catch (err) { $("#loginMessage").textContent = err.message; }
  finally { button.disabled = false; }
});
$("#logoutBtn").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST" }); setAdminMode(false); }
  catch (e) { alert(e.message); }
});
$("#uploadForm").addEventListener("submit", async e => {
  e.preventDefault();
  const button = e.currentTarget.querySelector("button");
  const message = $("#uploadMessage");
  button.disabled = true;
  message.textContent = "Enviando sua imagem...";
  try {
    const result = await fetch("/api/wallpapers", { method: "POST", body: new FormData(e.currentTarget) });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error || "Falha no envio.");
    e.currentTarget.reset();
    message.textContent = "Wallpaper publicado com sucesso!";
    await loadWallpapers();
  } catch (err) { message.textContent = err.message; }
  finally { button.disabled = false; }
});
(async function init() {
  try {
    const session = await api("/api/session");
    setAdminMode(session.isAdmin);
    await loadWallpapers();
  } catch (e) {
    $("#galleryGrid").innerHTML = `<div class="no-results">${escapeHTML(e.message)}</div>`;
  }
})();
