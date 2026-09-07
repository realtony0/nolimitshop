/* ==========================================================================
   NOLIMIT SHOP — BACK-OFFICE
   --------------------------------------------------------------------------
   Gère le contenu du site (produits, catégories, livraison, boutique, FAQ)
   et publie les changements en réécrivant assets/js/config.js directement
   sur le disque, via l'accès au dossier du site donné par le navigateur
   (File System Access API — Chrome / Edge). Sans ce dossier connecté, la
   publication se fait en copiant/téléchargeant le code généré.

   ⚠️ Cette page n'est pas protégée par une vraie sécurité serveur : le mot
   de passe empêche seulement les curieux. Ne partage pas ce lien.
   ========================================================================== */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fcfa = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
const uid = () => Math.random().toString(36).slice(2, 8);

const PWD_KEY   = 'nolimit_admin_pwd';
const DRAFT_KEY = 'nolimit_admin_draft';
const DIRTY_KEY = 'nolimit_admin_dirty';
const AUTH_KEY  = 'nolimit_admin_auth';
const DEFAULT_PWD = 'nolimit2026';

const TITRES = {
  board: 'Tableau de bord', produits: 'Produits', categories: 'Catégories',
  livraison: 'Livraison', boutique: 'Boutique', faq: 'FAQ & avis', publier: 'Publier'
};
const GROUP_KEY = { epTailles: 'tailles', epCouleurs: 'couleurs', epDetails: 'details' };

let draft = null;          // copie de travail de window.CONFIG
let dirty = localStorage.getItem(DIRTY_KEY) === '1';
let tab = 'board';
let rechercheP = '';
let editingId = null;      // null = nouvel article
let editingProduit = null;
let dirHandle = null;
let cacheBust = Date.now();

/* ---------------------------------------------------------------- TOAST */
let toastTimer;
function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('toast--err', !!isErr);
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3400);
}

/* ------------------------------------------------------------- OUVERTURE */
function ouvrir(sel) { $(sel).hidden = false; document.body.classList.add('lock'); }
function fermerTout() {
  $$('.ovl').forEach(o => o.hidden = true);
  document.body.classList.remove('lock');
  editingId = null; editingProduit = null;
}

/* ------------------------------------------------------------- CHEMIN(S)
   Petit utilitaire pour lire/écrire une valeur dans draft via un chemin du
   type "boutique.nom" ou "livraison.zones.0.frais". */
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = val;
}

/* ------------------------------------------------------------ AUTHENTIFICATION */
const loadPwd  = () => localStorage.getItem(PWD_KEY) || DEFAULT_PWD;
const savePwd  = p  => localStorage.setItem(PWD_KEY, p);
const checkAuth = () => sessionStorage.getItem(AUTH_KEY) === '1';
function doLogin(pwd) {
  if (pwd === loadPwd()) { sessionStorage.setItem(AUTH_KEY, '1'); afficherApp(); return true; }
  return false;
}
function doLogout() { sessionStorage.removeItem(AUTH_KEY); location.reload(); }

/* ------------------------------------------------------------------- BROUILLON */
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* brouillon corrompu : on repart du fichier publié */ }
  return JSON.parse(JSON.stringify(window.CONFIG));
}
function saveDraftLocal() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  dirty = true; localStorage.setItem(DIRTY_KEY, '1');
  majDirty();
}
function majDirty() { $('#dirty').hidden = !dirty; }

/* ------------------------------------------------------- DOSSIER DU SITE
   File System Access API : on garde le handle du dossier du site (celui qui
   contient index.html) dans IndexedDB pour ne le redemander qu'une fois. */
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('nolimit_admin', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('handles');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbSet(key, val) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(val, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('handles', 'readonly');
    const rq = tx.objectStore('handles').get(key);
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
  });
}

async function restaurerDossier() {
  try {
    const handle = await idbGet('site');
    if (handle) dirHandle = handle;
  } catch (e) { /* pas grave : on redemandera */ }
}

async function connecterDossier() {
  if (!window.showDirectoryPicker) {
    toast("Ce navigateur ne permet pas la publication automatique. Utilise Chrome ou Edge, ou publie à la main plus bas.", true);
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ id: 'nolimit-site', mode: 'readwrite' });
    await handle.getFileHandle('index.html'); // vérifie que c'est le bon dossier
    dirHandle = handle;
    await idbSet('site', handle);
    toast('Dossier du site connecté ✓');
  } catch (e) {
    if (e.name !== 'AbortError') {
      toast("Impossible d'utiliser ce dossier — choisis le dossier qui contient index.html.", true);
    }
  }
  if (tab === 'publier') render();
}

async function verifierPermission(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

async function ecrireFichier(dir, chemin, contenu) {
  const parts = chemin.split('/');
  const nom = parts.pop();
  let cur = dir;
  for (const p of parts) cur = await cur.getDirectoryHandle(p, { create: true });
  const fh = await cur.getFileHandle(nom, { create: true });
  const w = await fh.createWritable();
  await w.write(contenu);
  await w.close();
}

function genererConfigJs(cfg) {
  return `/* ==========================================================================
   NOLIMIT SHOP — FICHIER DE CONFIGURATION
   --------------------------------------------------------------------------
   ⚠️ Généré automatiquement par le back-office (admin.html).
   Toute modification faite ici à la main sera écrasée à la prochaine
   publication. Pour changer le contenu du site, utilise le back-office.
   Dernière publication : ${new Date().toLocaleString('fr-FR')}
   ========================================================================== */

window.CONFIG = ${JSON.stringify(cfg, null, 2)};
`;
}

async function publier() {
  if (!dirHandle) { toast("Connecte d'abord le dossier du site (onglet Publier).", true); return; }
  const ok = await verifierPermission(dirHandle);
  if (!ok) { toast('Autorisation refusée par le navigateur.', true); return; }
  try {
    await ecrireFichier(dirHandle, 'assets/js/config.js', genererConfigJs(draft));
    dirty = false; localStorage.setItem(DIRTY_KEY, '0'); majDirty();
    toast('Site publié ✓ — rafraîchis la page de la boutique pour voir les changements');
  } catch (e) {
    console.error(e);
    toast('Erreur pendant la publication : ' + e.message, true);
  }
}

async function ajouterPhotos(files, baseId) {
  if (!dirHandle) { toast('Connecte le dossier du site (onglet Publier) pour ajouter des photos.', true); return []; }
  const ok = await verifierPermission(dirHandle);
  if (!ok) { toast('Autorisation refusée par le navigateur.', true); return []; }
  const chemins = [];
  let i = 1;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const nom = `${baseId || 'article'}-${Date.now()}-${i}.${ext}`;
    try {
      await ecrireFichier(dirHandle, `assets/img/${nom}`, f);
      chemins.push(`assets/img/${nom}`);
    } catch (e) { console.error(e); toast('Échec pour ' + f.name, true); }
    i++;
  }
  cacheBust = Date.now();
  return chemins;
}

/* -------------------------------------------------------------- UTILITAIRES */
function catNom(id) { const c = draft.categories.find(x => x.id === id); return c ? c.nom : id; }

/* -------------------------------------------------------------- PRODUITS */
function rowProduitHtml(p) {
  const img = (p.images || [])[0];
  return `<div class="prow">
    <div class="prow__img">${img
      ? `<img src="${esc(img)}?t=${cacheBust}" alt="" onerror="this.remove()">`
      : `<i>${esc((p.nom || '?').charAt(0).toUpperCase())}</i>`}</div>
    <div class="prow__in">
      <p class="prow__nom">${esc(p.nom)}
        ${p.stock ? '<span class="tag tag--ok">En stock</span>' : '<span class="tag tag--off">Rupture</span>'}
        ${p.prixBarre > p.prix ? '<span class="tag tag--promo">Promo</span>' : ''}
      </p>
      <p class="prow__meta">${esc(catNom(p.categorie))}${(p.tailles || []).length ? ' · ' + esc(p.tailles.join(', ')) : ''}</p>
    </div>
    <div class="prow__prix">${fcfa(p.prix)}${p.prixBarre > p.prix ? `<s>${fcfa(p.prixBarre)}</s>` : ''}</div>
    <div class="prow__act">
      <button type="button" class="iconb" data-editp="${esc(p.id)}" title="Modifier">✏️</button>
      <button type="button" class="iconb" data-togglestock="${esc(p.id)}" title="${p.stock ? 'Marquer en rupture' : 'Marquer en stock'}">${p.stock ? '📦' : '🚫'}</button>
      <button type="button" class="iconb iconb--danger" data-delp="${esc(p.id)}" title="Supprimer">🗑️</button>
    </div>
  </div>`;
}

function renderProduits() {
  const q = rechercheP.trim().toLowerCase();
  const liste = draft.produits.filter(p => !q || (p.nom + ' ' + catNom(p.categorie)).toLowerCase().includes(q));
  return `
    <div class="tools">
      <input type="search" id="rechP" placeholder="Rechercher un article…" value="${esc(rechercheP)}" style="flex:1 1 220px;padding:11px 15px;border-radius:11px;border:1px solid var(--line-2);background:#fff;outline:none">
      <button type="button" class="btn btn--primary" data-newp="1">+ Ajouter un article</button>
    </div>
    <div class="plist" id="plistBox">${liste.map(rowProduitHtml).join('') || '<p style="color:var(--ink-3);text-align:center;padding:30px 0">Aucun article ne correspond.</p>'}</div>
  `;
}
function bindProduitsSearch() {
  const el = $('#rechP');
  if (!el) return;
  el.addEventListener('input', () => {
    rechercheP = el.value;
    const q = rechercheP.trim().toLowerCase();
    const liste = draft.produits.filter(p => !q || (p.nom + ' ' + catNom(p.categorie)).toLowerCase().includes(q));
    $('#plistBox').innerHTML = liste.map(rowProduitHtml).join('') || '<p style="color:var(--ink-3);text-align:center;padding:30px 0">Aucun article ne correspond.</p>';
  });
}

/* --------------------------------------------------------- FICHE PRODUIT */
function rowSimple(group, i, val, ph) {
  return `<div class="row">
    <label class="f" style="margin:0"><input type="text" value="${esc(val)}" placeholder="${esc(ph)}" data-rowinput="${group}:${i}"></label>
    <button type="button" class="row__x" data-delrow="${group}:${i}" title="Retirer">✕</button>
  </div>`;
}
function photoBox(src, i) {
  return `<div class="photo">
    <div class="photo__box">
      <img src="${esc(src)}?t=${cacheBust}" alt="" onerror="this.parentElement.innerHTML='<div style=display:grid;place-items:center;height:100%;color:var(--ink-3);font-size:1.4rem>?</div>'">
      <button type="button" class="photo__x" data-delphoto="${i}" title="Retirer">✕</button>
    </div>
    <p class="photo__n">${esc(src.split('/').pop())}</p>
  </div>`;
}
function formProduitHtml(p) {
  return `
    <label class="f"><span>Nom de l'article *</span><input type="text" id="epNom" value="${esc(p.nom)}" placeholder="Ex : Chemise en lin"></label>
    <label class="f"><span>Sous-titre</span><input type="text" id="epSt" value="${esc(p.sousTitre || '')}" placeholder="Ex : Manches longues, coupe droite"></label>
    <div class="f2">
      <label class="f"><span>Catégorie</span>
        <select id="epCat">${draft.categories.map(c => `<option value="${esc(c.id)}" ${c.id === p.categorie ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select>
      </label>
      <label class="f"><span>Badge (facultatif)</span><input type="text" id="epBadge" value="${esc(p.badge || '')}" placeholder="Ex : Nouveau"></label>
    </div>
    <div class="f2">
      <label class="f"><span>Prix de vente (FCFA) *</span><input type="number" id="epPrix" value="${p.prix || 0}" min="0" step="500"></label>
      <label class="f"><span>Ancien prix barré (0 = pas de promo)</span><input type="number" id="epBarre" value="${p.prixBarre || 0}" min="0" step="500"></label>
    </div>
    <label class="switch"><input type="checkbox" id="epStock" ${p.stock ? 'checked' : ''}><span>Article disponible (en stock)</span></label>
    <label class="f"><span>Description</span><textarea id="epDesc" rows="3">${esc(p.description || '')}</textarea></label>

    <div class="f"><span>Tailles disponibles</span>
      <div class="rows">${(p.tailles || []).map((t, i) => rowSimple('epTailles', i, t, 'Ex : M')).join('')}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addrow="epTailles">+ Ajouter une taille</button>
    </div>
    <div class="f"><span>Couleurs disponibles</span>
      <div class="rows">${(p.couleurs || []).map((t, i) => rowSimple('epCouleurs', i, t, 'Ex : Noir')).join('')}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addrow="epCouleurs">+ Ajouter une couleur</button>
    </div>
    <div class="f"><span>Points forts</span>
      <div class="rows">${(p.details || []).map((t, i) => rowSimple('epDetails', i, t, 'Ex : 100 % coton')).join('')}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addrow="epDetails">+ Ajouter une caractéristique</button>
    </div>

    <div class="f"><span>Photos</span>
      <div class="photos">
        ${(p.images || []).map((src, i) => photoBox(src, i)).join('')}
        <label class="drop">+ Ajouter<input type="file" id="epUpload" accept="image/*" multiple hidden></label>
      </div>
      <small>${dirHandle ? 'Les photos sont enregistrées directement dans assets/img.' : "⚠️ Connecte le dossier du site (onglet Publier) pour ajouter des photos depuis cet écran."}</small>
    </div>
  `;
}

function openProduitEditor(id) {
  const base = id ? draft.produits.find(p => p.id === id) : {
    id: '', nom: '', sousTitre: '', categorie: (draft.categories[0] || {}).id || '',
    prix: 0, prixBarre: 0, stock: true, vedette: false, badge: '',
    description: '', tailles: [], couleurs: [], details: [], images: []
  };
  if (id && !base) { toast('Article introuvable.', true); return; }
  editingId = id;
  editingProduit = JSON.parse(JSON.stringify(base));
  $('#editTitre').textContent = id ? "Modifier l'article" : 'Ajouter un article';
  $('#editBody').innerHTML = formProduitHtml(editingProduit);
  ouvrir('#ovlEdit');
}

function syncFormToEditingProduit() {
  if (!editingProduit) return;
  if ($('#epNom'))   editingProduit.nom = $('#epNom').value.trim();
  if ($('#epSt'))    editingProduit.sousTitre = $('#epSt').value.trim();
  if ($('#epCat'))   editingProduit.categorie = $('#epCat').value;
  if ($('#epBadge')) editingProduit.badge = $('#epBadge').value.trim();
  if ($('#epPrix'))  editingProduit.prix = Number($('#epPrix').value || 0);
  if ($('#epBarre')) editingProduit.prixBarre = Number($('#epBarre').value || 0);
  if ($('#epStock')) editingProduit.stock = $('#epStock').checked;
  if ($('#epDesc'))  editingProduit.description = $('#epDesc').value.trim();
}

function reredessinerFiche() { $('#editBody').innerHTML = formProduitHtml(editingProduit); }

function saveProduit() {
  syncFormToEditingProduit();
  if (!editingProduit.nom) { toast("Le nom de l'article est obligatoire.", true); return; }
  if (!editingProduit.categorie) { toast('Choisis une catégorie.', true); return; }
  if (!editingProduit.prix || editingProduit.prix <= 0) { toast('Indique un prix de vente.', true); return; }

  if (!editingId) {
    let base = slugify(editingProduit.nom) || 'article', id = base, n = 2;
    while (draft.produits.some(p => p.id === id)) id = `${base}-${n++}`;
    editingProduit.id = id;
    draft.produits.push(editingProduit);
  } else {
    const idx = draft.produits.findIndex(p => p.id === editingId);
    if (idx === -1) { toast('Article introuvable.', true); return; }
    draft.produits[idx] = editingProduit;
  }
  saveDraftLocal();
  fermerTout();
  render();
  toast('Article enregistré ✓ — pense à publier');
}

/* ------------------------------------------------------------ CATÉGORIES */
function catRowHtml(c, i) {
  const nb = draft.produits.filter(p => p.categorie === c.id).length;
  return `<div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
    <div style="display:flex;gap:8px;align-items:flex-end">
      <label class="f" style="max-width:70px;margin:0"><span>Emoji</span><input type="text" data-bind="categories.${i}.emoji" value="${esc(c.emoji || '')}" maxlength="4"></label>
      <label class="f" style="flex:1;margin:0"><span>Nom affiché</span><input type="text" data-bind="categories.${i}.nom" value="${esc(c.nom)}"></label>
      <button type="button" class="row__x" data-delcat="${i}" title="Supprimer">✕</button>
    </div>
    <p style="font-size:.74rem;color:var(--ink-3);margin:0">${nb} article${nb > 1 ? 's' : ''} · id technique <code>${esc(c.id)}</code></p>
  </div>`;
}
function renderCategories() {
  return `
    <div class="card">
      <h2>Catégories</h2>
      <p class="card__sub">Elles apparaissent comme filtres et vignettes sur le site, dans cet ordre. L'identifiant technique ne change pas pour ne pas perdre le lien avec les articles déjà classés.</p>
      <div class="rows">${draft.categories.map(catRowHtml).join('') || '<p style="color:var(--ink-3)">Aucune catégorie.</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addcat="1">+ Ajouter une catégorie</button>
    </div>
  `;
}

/* ------------------------------------------------------------- LIVRAISON */
function zoneRowHtml(z, i) {
  return `<div class="row" style="flex-wrap:wrap">
    <label class="f" style="flex:2 1 160px;margin:0"><span>Nom de la zone</span><input type="text" data-bind="livraison.zones.${i}.nom" value="${esc(z.nom)}"></label>
    <label class="f" style="flex:1 1 110px;margin:0"><span>Frais (FCFA)</span><input type="number" min="0" step="100" data-bind="livraison.zones.${i}.frais" value="${z.frais}"></label>
    <label class="f" style="flex:1 1 110px;margin:0"><span>Délai</span><input type="text" data-bind="livraison.zones.${i}.delai" value="${esc(z.delai)}"></label>
    <button type="button" class="row__x" data-delzone="${i}" title="Supprimer">✕</button>
  </div>`;
}
function renderLivraison() {
  return `
    <div class="card">
      <h2>Livraison gratuite</h2>
      <label class="f"><span>Montant à partir duquel la livraison est offerte (0 = désactivé)</span>
        <input type="number" min="0" step="500" data-bind="livraison.gratuiteApartir" value="${draft.livraison.gratuiteApartir || 0}"></label>
    </div>
    <div class="card">
      <h2>Zones de livraison</h2>
      <p class="card__sub">Elles apparaissent dans le menu déroulant au moment de la commande.</p>
      <div class="rows">${draft.livraison.zones.map(zoneRowHtml).join('')}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addzone="1">+ Ajouter une zone</button>
    </div>
  `;
}

/* -------------------------------------------------------------- BOUTIQUE */
function renderBoutique() {
  const b = draft.boutique;
  return `
    <div class="card">
      <h2>Identité</h2>
      <div class="f2">
        <label class="f"><span>Nom de la boutique</span><input type="text" data-bind="boutique.nom" value="${esc(b.nom)}"></label>
        <label class="f"><span>Slogan</span><input type="text" data-bind="boutique.slogan" value="${esc(b.slogan || '')}"></label>
      </div>
      <label class="f"><span>Description courte</span><input type="text" data-bind="boutique.description" value="${esc(b.description || '')}"></label>
    </div>
    <div class="card">
      <h2>Contact &amp; commandes</h2>
      <div class="hint"><b>Numéro WhatsApp</b>
        <p>Format international sans « + » ni espaces (ex : 221771234567). Dès qu'il est rempli, les commandes du site arrivent pré-remplies directement dans ton WhatsApp.</p>
      </div>
      <div class="f2">
        <label class="f"><span>Numéro WhatsApp</span><input type="text" data-bind="boutique.whatsapp" value="${esc(b.whatsapp || '')}" placeholder="221771234567"></label>
        <label class="f"><span>Lien WhatsApp court (repli si le numéro est vide)</span><input type="text" data-bind="boutique.whatsappLien" value="${esc(b.whatsappLien || '')}"></label>
      </div>
      <div class="f2">
        <label class="f"><span>Téléphone affiché</span><input type="text" data-bind="boutique.telephone" value="${esc(b.telephone || '')}"></label>
        <label class="f"><span>E-mail</span><input type="email" data-bind="boutique.email" value="${esc(b.email || '')}"></label>
      </div>
      <div class="f2">
        <label class="f"><span>Adresse / ville</span><input type="text" data-bind="boutique.adresse" value="${esc(b.adresse || '')}"></label>
        <label class="f"><span>Horaires</span><input type="text" data-bind="boutique.horaires" value="${esc(b.horaires || '')}"></label>
      </div>
    </div>
    <div class="card">
      <h2>Réseaux sociaux</h2>
      <p class="card__sub">Laisser vide pour cacher le lien sur le site.</p>
      <div class="f2">
        <label class="f"><span>Instagram</span><input type="text" data-bind="boutique.instagram" value="${esc(b.instagram || '')}"></label>
        <label class="f"><span>TikTok</span><input type="text" data-bind="boutique.tiktok" value="${esc(b.tiktok || '')}"></label>
      </div>
      <div class="f2">
        <label class="f"><span>Snapchat</span><input type="text" data-bind="boutique.snapchat" value="${esc(b.snapchat || '')}"></label>
        <label class="f"><span>Facebook</span><input type="text" data-bind="boutique.facebook" value="${esc(b.facebook || '')}"></label>
      </div>
    </div>
    <div class="card">
      <h2>Sécurité</h2>
      <p class="card__sub">Ce mot de passe protège uniquement l'accès à cette page depuis ce navigateur — ce n'est pas une sécurité serveur. Ne partage jamais le lien du back-office.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <label class="f" style="flex:1 1 200px;margin:0"><span>Nouveau mot de passe</span><input type="password" id="pwdNew" placeholder="4 caractères minimum"></label>
        <button type="button" class="btn btn--ghost btn--sm" id="btnPwdSave">Changer</button>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ FAQ */
function renderFaq() {
  return `
    <div class="card">
      <h2>Questions fréquentes</h2>
      <div class="rows">${draft.faq.map((f, i) => `
        <div class="row" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;gap:8px;align-items:flex-start">
            <label class="f" style="flex:1;margin:0"><span>Question</span><input type="text" data-bind="faq.${i}.q" value="${esc(f.q)}"></label>
            <button type="button" class="row__x" data-delfaq="${i}" title="Supprimer">✕</button>
          </div>
          <label class="f" style="margin:8px 0 0"><span>Réponse</span><textarea rows="2" data-bind="faq.${i}.r">${esc(f.r)}</textarea></label>
        </div>`).join('') || '<p style="color:var(--ink-3)">Aucune question.</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addfaq="1">+ Ajouter une question</button>
    </div>
    <div class="card">
      <h2>Avis clients</h2>
      <p class="card__sub">N'ajoute que de vrais avis de vrais clients. Tant que la liste est vide, la section n'apparaît pas sur le site.</p>
      <div class="rows">${draft.avis.map((a, i) => `
        <div class="row">
          <label class="f" style="flex:2;margin:0"><span>Avis</span><input type="text" data-bind="avis.${i}.texte" value="${esc(a.texte)}"></label>
          <label class="f" style="flex:1;margin:0"><span>Nom du client</span><input type="text" data-bind="avis.${i}.nom" value="${esc(a.nom)}"></label>
          <button type="button" class="row__x" data-delavis="${i}" title="Supprimer">✕</button>
        </div>`).join('') || '<p style="color:var(--ink-3)">Aucun avis pour l\'instant.</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addavis="1">+ Ajouter un avis</button>
    </div>
  `;
}

/* --------------------------------------------------------------- PUBLIER */
function renderPublier() {
  const supporte = !!window.showDirectoryPicker;
  return `
    ${!supporte ? `<div class="hint"><b>Ce navigateur ne permet pas la publication automatique.</b>
      <p>Utilise Google Chrome ou Microsoft Edge pour publier en un clic. En attendant, copie le code ci-dessous dans <code>assets/js/config.js</code>.</p></div>` : ''}
    <div class="card">
      <h2>Dossier du site</h2>
      <p class="card__sub">Connecte le dossier <code>nolimitshop</code> une seule fois (celui qui contient <code>index.html</code>). Le back-office pourra ensuite publier tes modifications directement dedans.</p>
      <p style="margin-bottom:14px">${dirHandle ? `✅ Dossier connecté : <b>${esc(dirHandle.name)}</b>` : '⚠️ Aucun dossier connecté'}</p>
      ${supporte ? `<button type="button" class="btn btn--ghost btn--sm" id="btnConnect">${dirHandle ? 'Reconnecter' : 'Connecter le dossier du site'}</button>` : ''}
    </div>
    <div class="card">
      <h2>Publier les modifications</h2>
      <p class="card__sub">Écrit le fichier <code>assets/js/config.js</code> avec tes derniers changements. Le site est mis à jour immédiatement.</p>
      <button type="button" class="btn btn--ok btn--full" id="btnPublish" ${supporte && dirHandle ? '' : 'disabled'}>🚀 Publier maintenant</button>
    </div>
    <div class="card">
      <h2>Publication manuelle</h2>
      <p class="card__sub">Si tu préfères (ou si ton navigateur ne le permet pas) : copie ce code et colle-le dans <code>assets/js/config.js</code> à la place de tout le contenu, puis enregistre.</p>
      <div class="code">${esc(genererConfigJs(draft))}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn btn--ghost btn--sm" id="btnCopyCode">Copier le code</button>
        <button type="button" class="btn btn--ghost btn--sm" id="btnDownloadCode">Télécharger config.js</button>
      </div>
    </div>
  `;
}

/* ---------------------------------------------------------- TABLEAU DE BORD */
function renderBoard() {
  const total = draft.produits.length;
  const rupture = draft.produits.filter(p => !p.stock).length;
  const promo = draft.produits.filter(p => p.prixBarre > p.prix).length;
  const valeur = draft.produits.reduce((s, p) => s + p.prix, 0);
  return `
    <div class="hint">
      <b>Comment ça marche</b>
      <p>Modifie tes produits, prix, photos et informations dans les onglets à gauche. Rien n'est visible sur le site tant que tu n'as pas cliqué sur <b>Publier</b>.</p>
      <p style="margin-top:8px">${dirHandle ? '✅ Dossier du site connecté — tu peux publier en un clic.' : "⚠️ Dossier du site non connecté — va dans l'onglet <b>Publier</b> pour le connecter."}</p>
    </div>
    <div class="stats">
      <div class="stat"><b>${total}</b><span>Articles au catalogue</span></div>
      <div class="stat stat--danger"><b>${rupture}</b><span>En rupture de stock</span></div>
      <div class="stat stat--warn"><b>${promo}</b><span>En promotion</span></div>
      <div class="stat"><b>${fcfa(valeur)}</b><span>Valeur du catalogue</span></div>
    </div>
    <div class="card">
      <h2>Derniers articles</h2>
      <p class="card__sub">Aperçu rapide — l'onglet « Produits » permet de tout gérer.</p>
      <div class="plist">${draft.produits.slice(0, 4).map(rowProduitHtml).join('') || '<p style="color:var(--ink-3)">Aucun article pour l\'instant.</p>'}</div>
    </div>
  `;
}

/* -------------------------------------------------------------- RENDU */
const RENDERERS = {
  board: renderBoard, produits: renderProduits, categories: renderCategories,
  livraison: renderLivraison, boutique: renderBoutique, faq: renderFaq, publier: renderPublier
};
function render() {
  $('#page').innerHTML = (RENDERERS[tab] || renderBoard)();
  if (tab === 'produits') bindProduitsSearch();
}
function goTab(t) {
  tab = t;
  $$('.tab').forEach(b => b.classList.toggle('is-on', b.dataset.tab === t));
  $('#pageTitre').textContent = TITRES[t] || '';
  render();
  window.scrollTo(0, 0);
  $('.side').classList.remove('is-open');
}

/* ------------------------------------------------------------- ÉVÉNEMENTS */
function onInput(e) {
  const bind = e.target.closest('[data-bind]');
  if (bind) {
    let val = bind.value;
    if (bind.type === 'number') val = val === '' ? 0 : Number(val);
    setPath(draft, bind.dataset.bind, val);
    saveDraftLocal();
    return;
  }
  const ri = e.target.closest('[data-rowinput]');
  if (ri && editingProduit) {
    const [group, i] = ri.dataset.rowinput.split(':');
    const key = GROUP_KEY[group];
    editingProduit[key][+i] = ri.value;
  }
}

function onChange(e) {
  const bind = e.target.closest('[data-bind]');
  if (bind && (bind.tagName === 'SELECT' || bind.type === 'checkbox')) {
    const val = bind.type === 'checkbox' ? bind.checked : bind.value;
    setPath(draft, bind.dataset.bind, val);
    saveDraftLocal();
  }
}

async function onFileChange(e) {
  if (e.target.id !== 'epUpload' || !editingProduit) return;
  const files = [...e.target.files];
  if (!files.length) return;
  if (!dirHandle) { toast('Connecte le dossier du site (onglet Publier) pour ajouter des photos.', true); return; }
  syncFormToEditingProduit();
  toast('Enregistrement des photos…');
  const base = editingProduit.id || slugify(editingProduit.nom || 'article');
  const chemins = await ajouterPhotos(files, base);
  editingProduit.images.push(...chemins);
  reredessinerFiche();
  if (chemins.length) toast(`${chemins.length} photo(s) ajoutée(s) ✓`);
}

async function onClick(e) {
  const t = e.target;

  if (t.closest('[data-close]') || t.classList.contains('ovl')) { fermerTout(); return; }

  // ---- produits
  if (t.closest('[data-newp]'))  { openProduitEditor(null); return; }
  const editp = t.closest('[data-editp]');   if (editp)  { openProduitEditor(editp.dataset.editp); return; }
  const togp  = t.closest('[data-togglestock]');
  if (togp) {
    const p = draft.produits.find(x => x.id === togp.dataset.togglestock);
    if (p) { p.stock = !p.stock; saveDraftLocal(); render(); toast(p.stock ? 'Article marqué en stock' : 'Article marqué en rupture'); }
    return;
  }
  const delp = t.closest('[data-delp]');
  if (delp) {
    const p = draft.produits.find(x => x.id === delp.dataset.delp);
    if (p && confirm(`Supprimer définitivement « ${p.nom} » ?`)) {
      draft.produits = draft.produits.filter(x => x.id !== p.id);
      saveDraftLocal(); render(); toast('Article supprimé');
    }
    return;
  }

  // ---- fiche produit (modale)
  if (t.closest('#btnSaveP')) { saveProduit(); return; }
  const addrow = t.closest('[data-addrow]');
  if (addrow) {
    syncFormToEditingProduit();
    editingProduit[GROUP_KEY[addrow.dataset.addrow]].push('');
    reredessinerFiche();
    return;
  }
  const delrow = t.closest('[data-delrow]');
  if (delrow) {
    syncFormToEditingProduit();
    const [group, i] = delrow.dataset.delrow.split(':');
    editingProduit[GROUP_KEY[group]].splice(+i, 1);
    reredessinerFiche();
    return;
  }
  const delphoto = t.closest('[data-delphoto]');
  if (delphoto) {
    syncFormToEditingProduit();
    editingProduit.images.splice(+delphoto.dataset.delphoto, 1);
    reredessinerFiche();
    return;
  }

  // ---- catégories
  if (t.closest('[data-addcat]')) {
    const nom = prompt('Nom de la nouvelle catégorie (ex : Pantalons)');
    if (!nom || !nom.trim()) return;
    let base = slugify(nom) || 'categorie', id = base, n = 2;
    while (draft.categories.some(c => c.id === id)) id = `${base}-${n++}`;
    draft.categories.push({ id, nom: nom.trim(), emoji: '🏷️' });
    saveDraftLocal(); render();
    return;
  }
  const delcat = t.closest('[data-delcat]');
  if (delcat) {
    const i = +delcat.dataset.delcat;
    const c = draft.categories[i];
    const nb = draft.produits.filter(p => p.categorie === c.id).length;
    if (nb > 0 && !confirm(`${nb} article(s) utilisent « ${c.nom} ». La supprimer quand même ? Ces articles resteront mais n'auront plus de catégorie visible tant que tu ne les modifies pas.`)) return;
    draft.categories.splice(i, 1);
    saveDraftLocal(); render();
    return;
  }

  // ---- livraison
  if (t.closest('[data-addzone]')) {
    draft.livraison.zones.push({ id: 'zone-' + uid(), nom: 'Nouvelle zone', frais: 0, delai: '24h' });
    saveDraftLocal(); render();
    return;
  }
  const delzone = t.closest('[data-delzone]');
  if (delzone) {
    if (draft.livraison.zones.length <= 1) { toast('Il doit rester au moins une zone de livraison.', true); return; }
    draft.livraison.zones.splice(+delzone.dataset.delzone, 1);
    saveDraftLocal(); render();
    return;
  }

  // ---- faq / avis
  if (t.closest('[data-addfaq]')) { draft.faq.push({ q: '', r: '' }); saveDraftLocal(); render(); return; }
  const delfaq = t.closest('[data-delfaq]');
  if (delfaq) { draft.faq.splice(+delfaq.dataset.delfaq, 1); saveDraftLocal(); render(); return; }
  if (t.closest('[data-addavis]')) { draft.avis.push({ texte: '', nom: '' }); saveDraftLocal(); render(); return; }
  const delavis = t.closest('[data-delavis]');
  if (delavis) { draft.avis.splice(+delavis.dataset.delavis, 1); saveDraftLocal(); render(); return; }

  // ---- boutique / sécurité
  if (t.closest('#btnPwdSave')) {
    const v = $('#pwdNew').value.trim();
    if (v.length < 4) { toast('Le mot de passe doit contenir au moins 4 caractères.', true); return; }
    savePwd(v); $('#pwdNew').value = '';
    toast('Mot de passe mis à jour ✓');
    return;
  }

  // ---- publier
  if (t.closest('#btnConnect')) { await connecterDossier(); return; }
  if (t.closest('#btnPublish')) { await publier(); return; }
  if (t.closest('#btnCopyCode')) {
    try { await navigator.clipboard.writeText(genererConfigJs(draft)); toast('Code copié ✓'); }
    catch (e) { toast('Impossible de copier automatiquement — sélectionne le texte à la main.', true); }
    return;
  }
  if (t.closest('#btnDownloadCode')) {
    const blob = new Blob([genererConfigJs(draft)], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'config.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return;
  }
}

/* ------------------------------------------------------------------ INIT */
function afficherApp() {
  $('#gate').hidden = true;
  $('#app').hidden = false;
  majDirty();
  goTab('board');
}

async function init() {
  draft = loadDraft();
  await restaurerDossier();

  $('#gateForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!doLogin($('#gatePwd').value)) {
      $('#gateErr').hidden = false;
      $('#gatePwd').value = '';
      $('#gatePwd').focus();
    }
  });
  $('#btnLogout').addEventListener('click', doLogout);
  $('#btnGoPub').addEventListener('click', () => goTab('publier'));
  $('#burger').addEventListener('click', () => $('.side').classList.toggle('is-open'));
  $$('.tab').forEach(b => b.addEventListener('click', () => goTab(b.dataset.tab)));

  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', e => { onChange(e); onFileChange(e); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerTout(); });

  if (checkAuth()) afficherApp();
}

init();

})();
