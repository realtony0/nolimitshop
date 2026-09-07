/* ==========================================================================
   NOLIMIT SHOP — BACK-OFFICE
   --------------------------------------------------------------------------
   Gère le contenu du site (produits, catégories, boutique, FAQ, avis) dans la
   base de données, via l'API (/api/...). Chaque modification est enregistrée
   immédiatement : il n'y a pas d'étape « publier ».
   Les photos sont envoyées dans le stockage R2 et servies par /img/<clé>.
   ========================================================================== */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fcfa = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

const AUTH_KEY = 'nolimit_admin_pwd';
const TITRES = {
  board: 'Tableau de bord', produits: 'Produits',
  categories: 'Catégories', boutique: 'Boutique', faq: 'FAQ & avis'
};
const GROUP_KEY = { epTailles: 'tailles', epCouleurs: 'couleurs', epDetails: 'details' };

let motdepasse = sessionStorage.getItem(AUTH_KEY) || '';
let data = { boutique: {}, categories: [], produits: [], faq: [], avis: [] };
let tab = 'board';
let rechercheP = '';
let editingId = null;
let editingProduit = null;

/* ------------------------------------------------------------------ RÉSEAU */
async function api(chemin, options = {}) {
  const opts = { ...options, headers: { ...(options.headers || {}) } };
  if (motdepasse) opts.headers.authorization = `Bearer ${motdepasse}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const r = await fetch(`/api${chemin}`, opts);
  let corps = null;
  try { corps = await r.json(); } catch (e) { /* réponse sans JSON */ }
  if (!r.ok) throw new Error((corps && corps.erreur) || `Erreur ${r.status}`);
  return corps;
}

let etatTimer;
function etat(msg, isErr) {
  const el = $('#etat');
  el.textContent = msg;
  el.hidden = false;
  el.style.color = isErr ? 'var(--danger)' : '';
  clearTimeout(etatTimer);
  etatTimer = setTimeout(() => { el.hidden = true; }, isErr ? 6000 : 2200);
}

let toastTimer;
function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('toast--err', !!isErr);
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3400);
}

/* Enveloppe les appels qui modifient : affiche l'état et récupère les erreurs. */
async function enregistrer(action, message = 'Enregistré ✓') {
  try {
    etat('Enregistrement…');
    const res = await action();
    etat(message);
    return res;
  } catch (e) {
    etat('Échec', true);
    toast(e.message, true);
    throw e;
  }
}

/* ------------------------------------------------------------- MODALE */
function ouvrir(sel) { $(sel).hidden = false; document.body.classList.add('lock'); }
function fermerTout() {
  $$('.ovl').forEach(o => o.hidden = true);
  document.body.classList.remove('lock');
  editingId = null; editingProduit = null;
}

/* --------------------------------------------------------------- CHARGEMENT */
async function charger() {
  const cfg = await api('/config');
  data = {
    boutique: cfg.boutique || {},
    categories: cfg.categories || [],
    produits: cfg.produits || [],
    faq: cfg.faq || [],
    avis: cfg.avis || []
  };
}

const catNom = id => (data.categories.find(c => c.id === id) || {}).nom || id;

/* ---------------------------------------------------------------- PRODUITS */
function rowProduitHtml(p) {
  const img = (p.images || [])[0];
  return `<div class="prow">
    <div class="prow__img">${img
      ? `<img src="${esc(img)}" alt="" onerror="this.remove()">`
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

function listeProduitsHtml() {
  const q = rechercheP.trim().toLowerCase();
  const liste = data.produits.filter(p => !q || (p.nom + ' ' + catNom(p.categorie)).toLowerCase().includes(q));
  return liste.map(rowProduitHtml).join('') ||
    '<p style="color:var(--ink-3);text-align:center;padding:30px 0">Aucun article ne correspond.</p>';
}

function renderProduits() {
  return `
    <div class="tools">
      <input type="search" id="rechP" placeholder="Rechercher un article…" value="${esc(rechercheP)}"
        style="flex:1 1 220px;padding:11px 15px;border-radius:11px;border:1px solid var(--line-2);background:#fff;outline:none">
      <button type="button" class="btn btn--primary" data-newp="1">+ Ajouter un article</button>
    </div>
    <div class="plist" id="plistBox">${listeProduitsHtml()}</div>`;
}

function bindProduitsSearch() {
  const el = $('#rechP');
  if (!el) return;
  el.addEventListener('input', () => {
    rechercheP = el.value;
    $('#plistBox').innerHTML = listeProduitsHtml();
  });
}

/* ----------------------------------------------------------- FICHE PRODUIT */
function rowSimple(group, i, val, ph) {
  return `<div class="row">
    <label class="f" style="margin:0"><input type="text" value="${esc(val)}" placeholder="${esc(ph)}" data-rowinput="${group}:${i}"></label>
    <button type="button" class="row__x" data-delrow="${group}:${i}" title="Retirer">✕</button>
  </div>`;
}
function photoBox(src, i) {
  return `<div class="photo">
    <div class="photo__box">
      <img src="${esc(src)}" alt="" onerror="this.parentElement.innerHTML='<div style=display:grid;place-items:center;height:100%;color:var(--ink-3)>?</div>'">
      <button type="button" class="photo__x" data-delphoto="${i}" title="Retirer">✕</button>
    </div>
  </div>`;
}
function formProduitHtml(p) {
  return `
    <label class="f"><span>Nom de l'article *</span><input type="text" id="epNom" value="${esc(p.nom)}" placeholder="Ex : Chemise en lin"></label>
    <label class="f"><span>Sous-titre</span><input type="text" id="epSt" value="${esc(p.sousTitre || '')}" placeholder="Ex : Coupe oversize"></label>
    <div class="f2">
      <label class="f"><span>Catégorie *</span>
        <select id="epCat">${data.categories.map(c =>
          `<option value="${esc(c.id)}" ${c.id === p.categorie ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select>
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
      <small>Les photos sont envoyées dans le stockage du site. Formats acceptés : JPG, PNG, WEBP — 8 Mo maximum.</small>
    </div>`;
}

function openProduitEditor(id) {
  if (!data.categories.length) {
    toast("Crée d'abord une catégorie dans l'onglet Catégories.", true);
    return;
  }
  const base = id ? data.produits.find(p => p.id === id) : {
    id: '', nom: '', sousTitre: '', categorie: data.categories[0].id,
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

function syncForm() {
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
const redessinerFiche = () => { $('#editBody').innerHTML = formProduitHtml(editingProduit); };

async function saveProduit() {
  syncForm();
  const p = editingProduit;
  if (!p.nom) { toast("Le nom de l'article est obligatoire.", true); return; }
  if (!p.categorie) { toast('Choisis une catégorie.', true); return; }
  if (!p.prix || p.prix <= 0) { toast('Indique un prix de vente.', true); return; }

  /* on retire les lignes vides laissées dans les listes */
  ['tailles', 'couleurs', 'details'].forEach(k => {
    p[k] = (p[k] || []).map(v => String(v).trim()).filter(Boolean);
  });

  await enregistrer(async () => {
    if (editingId) await api(`/produits/${encodeURIComponent(editingId)}`, { method: 'PUT', body: p });
    else await api('/produits', { method: 'POST', body: p });
    await charger();
  }, 'Article enregistré ✓');

  fermerTout();
  render();
  toast('Article enregistré ✓');
}

/* -------------------------------------------------------------- CATÉGORIES */
function catRowHtml(c) {
  const nb = data.produits.filter(p => p.categorie === c.id).length;
  return `<div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
    <div style="display:flex;gap:8px;align-items:flex-end">
      <label class="f" style="max-width:70px;margin:0"><span>Emoji</span>
        <input type="text" data-cat="${esc(c.id)}" data-champ="emoji" value="${esc(c.emoji || '')}" maxlength="4"></label>
      <label class="f" style="flex:1;margin:0"><span>Nom affiché</span>
        <input type="text" data-cat="${esc(c.id)}" data-champ="nom" value="${esc(c.nom)}"></label>
      <button type="button" class="row__x" data-delcat="${esc(c.id)}" title="Supprimer">✕</button>
    </div>
    <p style="font-size:.74rem;color:var(--ink-3);margin:0">${nb} article${nb > 1 ? 's' : ''} · identifiant <code>${esc(c.id)}</code></p>
  </div>`;
}
function renderCategories() {
  return `
    <div class="card">
      <h2>Catégories</h2>
      <p class="card__sub">Elles apparaissent comme filtres et vignettes sur le site, dans cet ordre. Les modifications sont enregistrées dès que tu quittes le champ.</p>
      <div class="rows">${data.categories.map(catRowHtml).join('') || '<p style="color:var(--ink-3)">Aucune catégorie pour l\'instant.</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addcat="1">+ Ajouter une catégorie</button>
    </div>`;
}

/* ---------------------------------------------------------------- BOUTIQUE */
function renderBoutique() {
  const b = data.boutique;
  const champ = (cle, label, ph = '') =>
    `<label class="f"><span>${label}</span><input type="text" data-b="${cle}" value="${esc(b[cle] || '')}" placeholder="${esc(ph)}"></label>`;
  return `
    <div class="card">
      <h2>Identité</h2>
      <div class="f2">${champ('nom', 'Nom de la boutique')}${champ('slogan', 'Slogan')}</div>
      ${champ('description', 'Description courte')}
    </div>
    <div class="card">
      <h2>Contact &amp; commandes</h2>
      <div class="hint"><b>Numéro WhatsApp</b>
        <p>Format international sans « + » ni espaces (ex : 221771234567). C'est là qu'arrivent les commandes du site.</p>
      </div>
      <div class="f2">
        ${champ('whatsapp', 'Numéro WhatsApp', '221771234567')}
        ${champ('whatsappLien', 'Lien WhatsApp court (secours)')}
      </div>
      <div class="f2">${champ('telephone', 'Téléphone affiché')}${champ('email', 'E-mail')}</div>
      <div class="f2">${champ('adresse', 'Adresse / ville')}${champ('horaires', 'Horaires')}</div>
    </div>
    <div class="card">
      <h2>Réseaux sociaux</h2>
      <p class="card__sub">Laisser vide pour cacher le lien sur le site.</p>
      <div class="f2">${champ('instagram', 'Instagram')}${champ('tiktok', 'TikTok')}</div>
      <div class="f2">${champ('snapchat', 'Snapchat')}${champ('facebook', 'Facebook')}</div>
    </div>
    <div class="card">
      <h2>Sécurité</h2>
      <p class="card__sub">Mot de passe d'accès à ce back-office. Ne le partage pas.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <label class="f" style="flex:1 1 200px;margin:0"><span>Nouveau mot de passe</span>
          <input type="password" id="pwdNew" placeholder="6 caractères minimum"></label>
        <button type="button" class="btn btn--ghost btn--sm" id="btnPwdSave">Changer</button>
      </div>
    </div>`;
}

/* --------------------------------------------------------------- FAQ / AVIS */
function renderFaq() {
  return `
    <div class="card">
      <h2>Questions fréquentes</h2>
      <div class="rows">${data.faq.map((f, i) => `
        <div class="row" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;gap:8px;align-items:flex-start">
            <label class="f" style="flex:1;margin:0"><span>Question</span>
              <input type="text" data-faq="${i}" data-champ="q" value="${esc(f.q)}"></label>
            <button type="button" class="row__x" data-delfaq="${i}" title="Supprimer">✕</button>
          </div>
          <label class="f" style="margin:8px 0 0"><span>Réponse</span>
            <textarea rows="2" data-faq="${i}" data-champ="r">${esc(f.r)}</textarea></label>
        </div>`).join('') || '<p style="color:var(--ink-3)">Aucune question.</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addfaq="1">+ Ajouter une question</button>
    </div>
    <div class="card">
      <h2>Avis clients</h2>
      <p class="card__sub">N'ajoute que de vrais avis de vrais clients. Tant que la liste est vide, la section n'apparaît pas sur le site.</p>
      <div class="rows">${data.avis.map((a, i) => `
        <div class="row">
          <label class="f" style="flex:2;margin:0"><span>Avis</span>
            <input type="text" data-avis="${i}" data-champ="texte" value="${esc(a.texte)}"></label>
          <label class="f" style="flex:1;margin:0"><span>Nom du client</span>
            <input type="text" data-avis="${i}" data-champ="nom" value="${esc(a.nom)}"></label>
          <button type="button" class="row__x" data-delavis="${i}" title="Supprimer">✕</button>
        </div>`).join('') || '<p style="color:var(--ink-3)">Aucun avis pour l\'instant.</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addavis="1">+ Ajouter un avis</button>
    </div>`;
}

/* ------------------------------------------------------------ TABLEAU DE BORD */
function renderBoard() {
  const total = data.produits.length;
  const rupture = data.produits.filter(p => !p.stock).length;
  const promo = data.produits.filter(p => p.prixBarre > p.prix).length;
  const valeur = data.produits.reduce((s, p) => s + p.prix, 0);
  return `
    <div class="hint">
      <b>Tout est enregistré en direct</b>
      <p>Chaque modification part immédiatement dans la base : le site est à jour dès que tu changes quelque chose. Pas d'étape « publier ».</p>
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
      <div class="plist">${data.produits.slice(0, 4).map(rowProduitHtml).join('') ||
        '<p style="color:var(--ink-3)">Aucun article pour l\'instant.</p>'}</div>
    </div>`;
}

/* -------------------------------------------------------------------- RENDU */
const RENDERERS = {
  board: renderBoard, produits: renderProduits,
  categories: renderCategories, boutique: renderBoutique, faq: renderFaq
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

/* --------------------------------------------------------------- SAUVEGARDES */
const sauverFaq  = () => enregistrer(() => api('/faq',  { method: 'PUT', body: data.faq }),  'FAQ enregistrée ✓');
const sauverAvis = () => enregistrer(() => api('/avis', { method: 'PUT', body: data.avis }), 'Avis enregistrés ✓');
const sauverBoutique = () => enregistrer(() => api('/boutique', { method: 'PUT', body: data.boutique }), 'Boutique enregistrée ✓');
const sauverCategorie = c => enregistrer(
  () => api(`/categories/${encodeURIComponent(c.id)}`, { method: 'PUT', body: { nom: c.nom, emoji: c.emoji } }),
  'Catégorie enregistrée ✓');

/* ------------------------------------------------------------- ÉVÉNEMENTS */
function onInput(e) {
  const t = e.target;

  const ri = t.closest('[data-rowinput]');
  if (ri && editingProduit) {
    const [group, i] = ri.dataset.rowinput.split(':');
    editingProduit[GROUP_KEY[group]][+i] = ri.value;
    return;
  }
  const b = t.closest('[data-b]');       if (b)  { data.boutique[b.dataset.b] = b.value; return; }
  const c = t.closest('[data-cat]');     if (c)  { const cat = data.categories.find(x => x.id === c.dataset.cat); if (cat) cat[c.dataset.champ] = c.value; return; }
  const f = t.closest('[data-faq]');     if (f)  { data.faq[+f.dataset.faq][f.dataset.champ] = f.value; return; }
  const a = t.closest('[data-avis]');    if (a)  { data.avis[+a.dataset.avis][a.dataset.champ] = a.value; return; }
}

/* On enregistre quand l'utilisateur quitte le champ, pas à chaque frappe. */
function onBlur(e) {
  const t = e.target;
  if (t.closest('[data-b]'))    { sauverBoutique().catch(() => {}); return; }
  if (t.closest('[data-faq]'))  { sauverFaq().catch(() => {}); return; }
  if (t.closest('[data-avis]')) { sauverAvis().catch(() => {}); return; }
  const c = t.closest('[data-cat]');
  if (c) {
    const cat = data.categories.find(x => x.id === c.dataset.cat);
    if (cat) sauverCategorie(cat).catch(() => {});
  }
}

async function onFileChange(e) {
  if (e.target.id !== 'epUpload' || !editingProduit) return;
  const fichiers = [...e.target.files];
  if (!fichiers.length) return;
  syncForm();

  etat('Envoi des photos…');
  let ajoutees = 0;
  for (const f of fichiers) {
    try {
      const form = new FormData();
      form.append('fichier', f);
      form.append('nom', editingProduit.nom || 'photo');
      const res = await api('/upload', { method: 'POST', body: form });
      editingProduit.images.push(res.chemin);
      ajoutees++;
    } catch (err) {
      toast(`${f.name} : ${err.message}`, true);
    }
  }
  redessinerFiche();
  if (ajoutees) { etat('Photos envoyées ✓'); toast(`${ajoutees} photo(s) ajoutée(s) — pense à enregistrer l'article`); }
  else etat('Échec', true);
}

async function onClick(e) {
  const t = e.target;

  if (t.closest('[data-close]') || t.classList.contains('ovl')) { fermerTout(); return; }

  /* --- produits */
  if (t.closest('[data-newp]')) { openProduitEditor(null); return; }
  const editp = t.closest('[data-editp]'); if (editp) { openProduitEditor(editp.dataset.editp); return; }

  const togp = t.closest('[data-togglestock]');
  if (togp) {
    const p = data.produits.find(x => x.id === togp.dataset.togglestock);
    if (!p) return;
    const maj = { ...p, stock: !p.stock };
    try {
      await enregistrer(() => api(`/produits/${encodeURIComponent(p.id)}`, { method: 'PUT', body: maj }));
      p.stock = maj.stock;
      render();
      toast(p.stock ? 'Article marqué en stock' : 'Article marqué en rupture');
    } catch (err) { /* déjà signalé */ }
    return;
  }

  const delp = t.closest('[data-delp]');
  if (delp) {
    const p = data.produits.find(x => x.id === delp.dataset.delp);
    if (!p || !confirm(`Supprimer définitivement « ${p.nom} » ?`)) return;
    try {
      await enregistrer(() => api(`/produits/${encodeURIComponent(p.id)}`, { method: 'DELETE' }), 'Article supprimé ✓');
      data.produits = data.produits.filter(x => x.id !== p.id);
      render();
      toast('Article supprimé');
    } catch (err) { /* déjà signalé */ }
    return;
  }

  /* --- fiche produit */
  if (t.closest('#btnSaveP')) { saveProduit().catch(() => {}); return; }
  const addrow = t.closest('[data-addrow]');
  if (addrow) { syncForm(); editingProduit[GROUP_KEY[addrow.dataset.addrow]].push(''); redessinerFiche(); return; }
  const delrow = t.closest('[data-delrow]');
  if (delrow) {
    syncForm();
    const [group, i] = delrow.dataset.delrow.split(':');
    editingProduit[GROUP_KEY[group]].splice(+i, 1);
    redessinerFiche();
    return;
  }
  const delphoto = t.closest('[data-delphoto]');
  if (delphoto) { syncForm(); editingProduit.images.splice(+delphoto.dataset.delphoto, 1); redessinerFiche(); return; }

  /* --- catégories */
  if (t.closest('[data-addcat]')) {
    const nom = prompt('Nom de la nouvelle catégorie (ex : Pantalons)');
    if (!nom || !nom.trim()) return;
    try {
      const c = await enregistrer(() => api('/categories', { method: 'POST', body: { nom: nom.trim(), emoji: '🏷️' } }), 'Catégorie créée ✓');
      data.categories.push(c);
      render();
    } catch (err) { /* déjà signalé */ }
    return;
  }
  const delcat = t.closest('[data-delcat]');
  if (delcat) {
    const c = data.categories.find(x => x.id === delcat.dataset.delcat);
    if (!c || !confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
    try {
      await enregistrer(() => api(`/categories/${encodeURIComponent(c.id)}`, { method: 'DELETE' }), 'Catégorie supprimée ✓');
      data.categories = data.categories.filter(x => x.id !== c.id);
      render();
    } catch (err) { /* déjà signalé */ }
    return;
  }

  /* --- faq / avis */
  if (t.closest('[data-addfaq]'))  { data.faq.push({ q: '', r: '' });      render(); return; }
  if (t.closest('[data-addavis]')) { data.avis.push({ texte: '', nom: '' }); render(); return; }
  const delfaq = t.closest('[data-delfaq]');
  if (delfaq)  { data.faq.splice(+delfaq.dataset.delfaq, 1);   render(); sauverFaq().catch(() => {});  return; }
  const delavis = t.closest('[data-delavis]');
  if (delavis) { data.avis.splice(+delavis.dataset.delavis, 1); render(); sauverAvis().catch(() => {}); return; }

  /* --- mot de passe */
  if (t.closest('#btnPwdSave')) {
    const v = $('#pwdNew').value.trim();
    if (v.length < 6) { toast('Le mot de passe doit contenir au moins 6 caractères.', true); return; }
    try {
      await enregistrer(() => api('/motdepasse', { method: 'PUT', body: { motdepasse: v } }), 'Mot de passe changé ✓');
      motdepasse = v;
      sessionStorage.setItem(AUTH_KEY, v);
      $('#pwdNew').value = '';
      toast('Mot de passe mis à jour ✓');
    } catch (err) { /* déjà signalé */ }
    return;
  }
}

/* -------------------------------------------------------------------- INIT */
async function afficherApp() {
  $('#gate').hidden = true;
  $('#app').hidden = false;
  try {
    await charger();
  } catch (e) {
    toast('Impossible de charger les données : ' + e.message, true);
  }
  goTab('board');
}

async function tenterConnexion(pwd) {
  try {
    motdepasse = pwd;
    await api('/login', { method: 'POST' });
    sessionStorage.setItem(AUTH_KEY, pwd);
    await afficherApp();
    return true;
  } catch (e) {
    motdepasse = '';
    sessionStorage.removeItem(AUTH_KEY);
    return false;
  }
}

function init() {
  $('#gateForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#gateForm button[type=submit]');
    btn.disabled = true;
    const ok = await tenterConnexion($('#gatePwd').value);
    btn.disabled = false;
    if (!ok) {
      $('#gateErr').hidden = false;
      $('#gatePwd').value = '';
      $('#gatePwd').focus();
    }
  });
  $('#btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });
  $('#burger').addEventListener('click', () => $('.side').classList.toggle('is-open'));
  $$('.tab').forEach(b => b.addEventListener('click', () => goTab(b.dataset.tab)));

  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('focusout', onBlur);
  document.addEventListener('change', onFileChange);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerTout(); });
  $('#btnSaveP').addEventListener('click', () => saveProduit().catch(() => {}));

  /* session déjà ouverte dans cet onglet */
  if (motdepasse) tenterConnexion(motdepasse);
}

init();

})();
