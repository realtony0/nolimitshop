/* ==========================================================================
   NOLIMIT SHOP — logique du site
   Catalogue, filtres, fiche produit, panier (localStorage) et commande
   envoyée sur WhatsApp. Rien à modifier ici au quotidien : tout le contenu
   est dans assets/js/config.js
   ========================================================================== */
(() => {
'use strict';

let C     = window.CONFIG;
const $   = (s, r = document) => r.querySelector(s);
const $$  = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'nolimit_cart_v1';

/* ------------------------------------------------------------- UTILITAIRES */
const fcfa = n => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
const esc  = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const produit = id => C.produits.find(p => p.id === id);
const catNom  = id => (C.categories.find(c => c.id === id) || {}).nom || id;

/* Visuel : la photo si elle existe, sinon un remplacement élégant. */
function media(p, idx = 0) {
  const src = (p.images || [])[idx];
  const ph  = `<div class="ph"><b>${esc(p.nom.charAt(0))}</b><i>${esc(p.nom)}</i></div>`;
  if (!src) return ph;
  return ph + `<img src="${esc(src)}" alt="${esc(p.nom)}" loading="lazy" onerror="this.remove()">`;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

/* ------------------------------------------------------------------ PANIER */
let cart = [];
try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cart = []; }

const saveCart = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} };
const sousTotal = () => cart.reduce((s, l) => {
  const p = produit(l.id);
  return p ? s + p.prix * l.qte : s;
}, 0);
const nbArticles = () => cart.reduce((s, l) => s + l.qte, 0);

function ajouter(id, taille, couleur, qte) {
  const cle = cart.find(l => l.id === id && l.taille === taille && l.couleur === couleur);
  if (cle) cle.qte += qte;
  else cart.push({ id, taille, couleur, qte });
  saveCart(); majPanier();
}

function majPanier() {
  const n = nbArticles();
  const b = $('#cartCount');
  b.textContent = n;
  b.hidden = n === 0;

  const body = $('#cartBody');
  const foot = $('#cartFoot');

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty">
        <b>Votre panier est vide</b>
        <p>Parcourez la boutique et ajoutez vos coups de cœur.</p>
      </div>`;
    foot.hidden = true;
    return;
  }

  body.innerHTML = cart.map((l, i) => {
    const p = produit(l.id);
    if (!p) return '';
    const opts = [l.taille, l.couleur].filter(Boolean).join(' · ');
    return `<article class="ci">
        <div class="ci__media">${media(p)}</div>
        <div class="ci__in">
          <p class="ci__nom">${esc(p.nom)}</p>
          ${opts ? `<p class="ci__opt">${esc(opts)}</p>` : ''}
          <p class="ci__prix">${fcfa(p.prix * l.qte)}</p>
          <div class="ci__bot">
            <div class="qty">
              <button type="button" data-cq="-1" data-i="${i}" aria-label="Retirer un">&minus;</button>
              <span>${l.qte}</span>
              <button type="button" data-cq="1" data-i="${i}" aria-label="Ajouter un">+</button>
            </div>
            <button type="button" class="ci__del" data-del="${i}">Retirer</button>
          </div>
        </div>
      </article>`;
  }).join('');

  $('#cartSub').textContent = fcfa(sousTotal());
  foot.hidden = false;
}

/* --------------------------------------------------------------- CATALOGUE */
let filtre = 'tous', recherche = '';

function rendreFiltres() {
  $('#filters').innerHTML =
    [{ id: 'tous', nom: 'Tout voir' }, ...C.categories]
      .map(c => `<button type="button" class="chip${c.id === filtre ? ' is-on' : ''}" data-f="${c.id}">${esc(c.nom)}</button>`)
      .join('');
}

function rendreGrille() {
  const q = recherche.trim().toLowerCase();
  const liste = C.produits.filter(p => {
    const okCat = filtre === 'tous' || p.categorie === filtre;
    const okQ = !q || (p.nom + ' ' + (p.sousTitre || '') + ' ' + catNom(p.categorie)).toLowerCase().includes(q);
    return okCat && okQ;
  });

  $('#empty').hidden = liste.length > 0;
  $('#grid').innerHTML = liste.map(p => `
    <article class="card rev" data-p="${esc(p.id)}">
      <div class="card__media">
        ${media(p)}
        ${p.badge && p.stock ? `<span class="card__badge${p.prixBarre > p.prix ? ' card__badge--promo' : ''}">${esc(p.badge)}</span>` : ''}
        ${p.stock ? '' : '<span class="card__rupture">Bientôt de retour</span>'}
      </div>
      <div class="card__body">
        <span class="card__cat">${esc(catNom(p.categorie))}</span>
        <h3 class="card__nom">${esc(p.nom)}</h3>
        ${p.tailles && p.tailles.length ? `<p class="card__tailles">Tailles : ${esc(p.tailles.join(', '))}</p>` : ''}
        <p class="card__prix">
          <b>${fcfa(p.prix)}</b>
          ${p.prixBarre > p.prix ? `<s>${fcfa(p.prixBarre)}</s>` : ''}
        </p>
        <span class="btn btn--noir btn--full btn--sm card__cta">Voir le produit</span>
      </div>
    </article>`).join('');

  reveler($$('#grid .rev'));
}

/* ------------------------------------------------------------ FICHE PRODUIT */
let sel = { id: null, taille: '', couleur: '', qte: 1, img: 0 };

function ouvrirProduit(id) {
  const p = produit(id);
  if (!p) return;
  sel = {
    id,
    taille: (p.tailles && p.tailles[0]) || '',
    couleur: (p.couleurs && p.couleurs[0]) || '',
    qte: 1,
    img: 0
  };
  rendreProduit();
  ouvrir('#ovlProduit');
}

function rendreProduit() {
  const p = produit(sel.id);
  const remise = p.prixBarre > p.prix ? Math.round((1 - p.prix / p.prixBarre) * 100) : 0;
  const imgs = (p.images || []).length ? p.images : [null];

  $('#pdtBody').innerHTML = `
    <div>
      <div class="pdt__media">${media(p, sel.img)}</div>
      ${imgs.length > 1 ? `<div class="pdt__thumbs">${imgs.map((src, i) =>
        `<button type="button" class="${i === sel.img ? 'is-on' : ''}" data-img="${i}" aria-label="Photo ${i + 1}">${media(p, i)}</button>`
      ).join('')}</div>` : ''}
    </div>

    <div>
      <span class="pdt__cat">${esc(catNom(p.categorie))}</span>
      <h2 class="pdt__nom" id="pNom">${esc(p.nom)}</h2>
      ${p.sousTitre ? `<p class="pdt__st">${esc(p.sousTitre)}</p>` : ''}

      <div class="pdt__prix">
        <b>${fcfa(p.prix)}</b>
        ${remise ? `<s>${fcfa(p.prixBarre)}</s><span class="save">-${remise} %</span>` : ''}
      </div>

      ${p.description ? `<p class="pdt__desc">${esc(p.description)}</p>` : ''}

      ${p.details && p.details.length
        ? `<ul class="pdt__details">${p.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}

      ${p.tailles && p.tailles.length ? `
        <div class="opt">
          <span class="opt__lab">Taille</span>
          <div class="opt__row">${p.tailles.map(t =>
            `<button type="button" class="pill${t === sel.taille ? ' is-on' : ''}" data-taille="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        </div>` : ''}

      ${p.couleurs && p.couleurs.length ? `
        <div class="opt">
          <span class="opt__lab">Couleur</span>
          <div class="opt__row">${p.couleurs.map(c =>
            `<button type="button" class="pill${c === sel.couleur ? ' is-on' : ''}" data-couleur="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        </div>` : ''}

      <div class="opt">
        <span class="opt__lab">Quantité</span>
        <div class="qty">
          <button type="button" data-q="-1" aria-label="Diminuer">&minus;</button>
          <span>${sel.qte}</span>
          <button type="button" data-q="1" aria-label="Augmenter">+</button>
        </div>
      </div>

      <div class="pdt__actions">
        ${p.stock
          ? `<button type="button" class="btn btn--primary" id="btnAdd">Ajouter au panier · ${fcfa(p.prix * sel.qte)}</button>`
          : `<button type="button" class="btn btn--primary" disabled>Article en rupture</button>`}
      </div>
    </div>`;
}

/* ------------------------------------------------------------- COMMANDE
   Pas de frais ni de délai de livraison affichés ici : ce ne sont pas des
   informations confirmées par la boutique. Le sous-total du panier est le
   seul montant annoncé ; le reste (frais, délai, mode de paiement) se règle
   directement dans la conversation WhatsApp qui suit l'envoi de la commande. */
function rendreRecap() {
  const st = sousTotal();
  $('#recap').innerHTML = `
    ${cart.map(l => {
      const p = produit(l.id);
      if (!p) return '';
      const o = [l.taille, l.couleur].filter(Boolean).join(' · ');
      return `<div class="recap__l"><span>${l.qte} × ${esc(p.nom)}${o ? ' <small>(' + esc(o) + ')</small>' : ''}</span><span>${fcfa(p.prix * l.qte)}</span></div>`;
    }).join('')}
    <div class="recap__l recap__tot"><span>Sous-total</span><span>${fcfa(st)}</span></div>
    <p class="recap__pay">Les frais de livraison et le mode de paiement seront confirmés avec vous sur WhatsApp.</p>`;
}

function messageCommande(d) {
  const st = sousTotal();
  const lignes = cart.map(l => {
    const p = produit(l.id);
    if (!p) return '';
    const o = [l.taille, l.couleur].filter(Boolean).join(' · ');
    return `• ${l.qte} × ${p.nom}${o ? ' (' + o + ')' : ''} — ${fcfa(p.prix * l.qte)}`;
  }).filter(Boolean).join('\n');

  return `🛍️ *NOUVELLE COMMANDE — ${C.boutique.nom}*\n\n` +
    `${lignes}\n\n` +
    `Sous-total : ${fcfa(st)}\n\n` +
    `👤 Nom : ${d.prenom} ${d.nom}\n` +
    `📞 Téléphone : ${d.tel}\n` +
    (d.email ? `✉️ Email : ${d.email}\n` : '') +
    `📍 Adresse : ${d.adresse}\n` +
    `🏙️ Ville : ${d.ville}\n` +
    (d.note ? `📝 Message : ${d.note}\n` : '') +
    `\nMerci de me confirmer la commande 🙏`;
}

/* Lien WhatsApp : si le numéro est renseigné, le message part pré-rempli.
   Sinon on utilise le lien court de la boutique (sans pré-remplissage). */
const numeroOk = () => /^\d{8,15}$/.test(String(C.boutique.whatsapp || ''));
const lienWa = msg => numeroOk()
  ? `https://wa.me/${C.boutique.whatsapp}?text=${encodeURIComponent(msg)}`
  : (C.boutique.whatsappLien || '#');

/* --------------------------------------------------------- OUVRIR / FERMER */
function ouvrir(sel_) {
  $(sel_).hidden = false;
  document.body.classList.add('lock');
}
function fermerTout() {
  $$('.ovl').forEach(o => o.hidden = true);
  document.body.classList.remove('lock');
}

/* ------------------------------------------------------------- RENDU STATIQUE */
const ICONES = {
  truck: '<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
  cash:  '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  chat:  '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.2A8 8 0 1 1 21 12Z"/>'
};

function rendreStatique() {
  const b = C.boutique;

  /* catégories : chaque vignette prend la photo d'un article de la catégorie */
  $('#catsRow').innerHTML = C.categories.map(c => {
    const p = C.produits.find(x => x.categorie === c.id && (x.images || []).length);
    const img = p ? `<img src="${esc(p.images[0])}" alt="${esc(c.nom)}" loading="lazy">` : '';
    return `<button type="button" class="cat rev" data-f="${esc(c.id)}">
        ${img || `<div class="ph"><b>${esc(c.emoji || c.nom.charAt(0))}</b></div>`}
        <span class="cat__ovl">
          <span class="cat__n">${esc(c.nom)}</span>
          <span class="cat__d">Découvrir →</span>
        </span>
      </button>`;
  }).join('');

  /* visuel du hero : premier article mis en vedette */
  const vedette = C.produits.find(p => p.vedette && (p.images || []).length) ||
                  C.produits.find(p => (p.images || []).length);
  if (vedette) {
    $('#heroMedia').innerHTML =
      `<img src="${esc(vedette.images[0])}" alt="${esc(vedette.nom)}" fetchpriority="high">
       <span class="hero__tag">${esc(vedette.nom)} · ${fcfa(vedette.prix)}</span>`;
  }

  /* avis clients : la section reste cachée tant qu'il n'y a pas d'avis */
  const avis = C.avis || [];
  if (avis.length) {
    $('#secAvis').hidden = false;
    $('#avisList').innerHTML = avis.map(a => `
      <div class="avis__c rev">
        <p class="avis__e">★★★★★</p>
        <p class="avis__t">« ${esc(a.texte)} »</p>
        <p class="avis__n">${esc(a.nom)}</p>
      </div>`).join('');
  }

  /* atouts */
  $('#atoutsGrid').innerHTML = C.atouts.map(a => `
    <div class="atout rev">
      <div class="atout__ic"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${ICONES[a.icone] || ICONES.check}</svg></div>
      <h3>${esc(a.titre)}</h3>
      <p>${esc(a.texte)}</p>
    </div>`).join('');

  /* faq */
  $('#faqList').innerHTML = C.faq.map(f =>
    `<details class="qa"><summary>${esc(f.q)}</summary><p>${esc(f.r)}</p></details>`).join('');

  /* pied de page + contacts : chaque ligne ne s'affiche que si elle est
     réellement renseignée dans config.js — rien n'est deviné. */
  const ligneContact = (id, val) => { const el = $('#' + id); if (val) el.textContent = val; else el.remove(); };
  ligneContact('ftrTel', b.telephone);
  ligneContact('ftrMail', b.email);
  ligneContact('ftrAdr', b.adresse);
  ligneContact('ftrHoraires', b.horaires);
  $('#year').textContent       = new Date().getFullYear();
  document.title               = `${b.nom} — ${b.slogan}`;

  const soc = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['facebook', 'Facebook']]
    .filter(([k]) => b[k])
    .map(([k, nom]) => `<a href="${esc(b[k])}" target="_blank" rel="noopener">${nom}</a>`).join('');
  $('#ftrSoc').innerHTML = soc ? '<h3>Suivez-nous</h3>' + soc : '';
}

/* ------------------------------------------------------------- APPARITION
   Petite animation d'apparition au défilement. Si le navigateur ne gère pas
   IntersectionObserver, tout s'affiche directement. */
const reveler = els => els.forEach(el =>
  observer ? observer.observe(el) : el.classList.add('is-in'));

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, o) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); o.unobserve(e.target); } });
    }, { threshold: .12 })
  : null;

/* ------------------------------------------------------------- ÉVÉNEMENTS */
function brancher() {
  /* clic global */
  document.addEventListener('click', e => {
    const t = e.target;

    /* fermeture des modales */
    if (t.closest('[data-close]') || t.classList.contains('ovl')) { fermerTout(); return; }

    /* filtre catégorie (chips + raccourcis) */
    const f = t.closest('[data-f]');
    if (f) {
      filtre = f.dataset.f;
      recherche = ''; $('#search').value = '';
      rendreFiltres(); rendreGrille();
      document.getElementById('catalogue').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    /* ouvrir une fiche produit */
    const card = t.closest('[data-p]');
    if (card) { ouvrirProduit(card.dataset.p); return; }

    /* options de la fiche produit */
    const th = t.closest('[data-img]');    if (th) { sel.img = +th.dataset.img; rendreProduit(); return; }
    const ta = t.closest('[data-taille]'); if (ta) { sel.taille = ta.dataset.taille; rendreProduit(); return; }
    const co = t.closest('[data-couleur]');if (co) { sel.couleur = co.dataset.couleur; rendreProduit(); return; }
    const q  = t.closest('[data-q]');      if (q)  { sel.qte = Math.max(1, sel.qte + (+q.dataset.q)); rendreProduit(); return; }

    if (t.closest('#btnAdd')) {
      const p = produit(sel.id);
      ajouter(sel.id, sel.taille, sel.couleur, sel.qte);
      fermerTout();
      toast(`${p.nom} ajouté au panier ✓`);
      return;
    }

    /* panier : quantités et suppression */
    const cq = t.closest('[data-cq]');
    if (cq) {
      const i = +cq.dataset.i;
      cart[i].qte += (+cq.dataset.cq);
      if (cart[i].qte < 1) cart.splice(i, 1);
      saveCart(); majPanier(); return;
    }
    const del = t.closest('[data-del]');
    if (del) { cart.splice(+del.dataset.del, 1); saveCart(); majPanier(); return; }
  });

  /* ouverture du panier */
  $('#btnCart').addEventListener('click', () => { majPanier(); ouvrir('#ovlPanier'); });

  /* vider le panier */
  $('#btnClear').addEventListener('click', () => {
    if (!confirm('Vider entièrement le panier ?')) return;
    cart = []; saveCart(); majPanier(); toast('Panier vidé');
  });

  /* passer à la commande */
  $('#btnCheckout').addEventListener('click', () => {
    if (!cart.length) return;
    fermerTout(); rendreRecap(); ouvrir('#ovlCommande');
  });

  /* envoi de la commande */
  $('#formCmd').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const d = {
      prenom: (fd.get('prenom') || '').trim(),
      nom: (fd.get('nom') || '').trim(),
      tel: (fd.get('tel') || '').trim(),
      email: (fd.get('email') || '').trim(),
      adresse: (fd.get('adresse') || '').trim(),
      ville: (fd.get('ville') || '').trim(),
      note: (fd.get('note') || '').trim()
    };
    let ok = true;
    ['prenom', 'nom', 'tel', 'adresse', 'ville'].forEach(k => {
      const input = e.target.elements[k];
      const vide = !d[k] || (k === 'tel' && d.tel.replace(/\D/g, '').length < 7);
      input.classList.toggle('err', vide);
      if (vide) ok = false;
    });
    if (!ok) { toast('Merci de remplir vos coordonnées'); return; }

    /* On enregistre la commande en base AVANT d'ouvrir WhatsApp : c'est ce qui
       permet à la boutique de la retrouver dans le back-office et d'en être
       notifiée, même si le client n'envoie finalement pas le message. */
    const articles = cart.map(l => ({ id: l.id, taille: l.taille, couleur: l.couleur, qte: l.qte }));
    fetch('/api/commandes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...d, articles })
    }).catch(() => { /* si l'enregistrement échoue, la commande part quand même sur WhatsApp */ });

    const msg = messageCommande(d);
    if (numeroOk()) {
      window.open(lienWa(msg), '_blank', 'noopener');
      toast('Commande envoyée sur WhatsApp ✓');
    } else {
      /* Pas de numéro : on copie la commande et on ouvre la conversation,
         le client n'a plus qu'à coller. */
      try { navigator.clipboard.writeText(msg); } catch (err) {}
      window.open(C.boutique.whatsappLien, '_blank', 'noopener');
      toast('Commande copiée — collez-la dans WhatsApp puis envoyez');
    }
    cart = []; saveCart(); majPanier();
    e.target.reset();
    setTimeout(fermerTout, 600);
  });

  /* recherche */
  $('#search').addEventListener('input', e => { recherche = e.target.value; rendreGrille(); });
  $('#btnSearch').addEventListener('click', () => {
    document.getElementById('catalogue').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('#search').focus(), 420);
  });

  /* menu mobile */
  $('#burger').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('is-open');
    $('#burger').setAttribute('aria-expanded', String(open));
  });
  $$('.nav__l').forEach(a => a.addEventListener('click', () => {
    $('#nav').classList.remove('is-open');
    $('#burger').setAttribute('aria-expanded', 'false');
  }));

  /* touche Échap */
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerTout(); });

  /* ombre du header au défilement */
  const hdr = $('#hdr');
  const onScroll = () => hdr.classList.toggle('is-stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------------------ DÉPART
   Le contenu vient de la base de données (/api/config), gérée depuis le
   back-office. assets/js/config.js sert de secours : si l'API ne répond pas
   (site ouvert en local sans serveur, coupure…), la boutique s'affiche quand
   même avec le dernier contenu connu. */
function demarrer() {
  rendreStatique();
  rendreFiltres();
  rendreGrille();
  majPanier();
  brancher();
  reveler($$('.rev'));
}

fetch('/api/config', { headers: { accept: 'application/json' } })
  .then(r => (r.ok ? r.json() : Promise.reject(new Error('API indisponible'))))
  .then(data => {
    if (data && Array.isArray(data.produits)) {
      /* atouts n'est pas en base : on garde ceux du fichier. */
      C = Object.assign({}, C, data, { atouts: C.atouts });
    }
  })
  .catch(() => { /* on garde le contenu de config.js */ })
  .finally(demarrer);

})();
