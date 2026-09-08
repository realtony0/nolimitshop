/* /api/commandes
   POST : enregistrement d'une commande envoyée depuis le site (public), puis
          notification push du back-office.
   GET  : liste des commandes (réservé au back-office). */
import { json, erreur, exigerAuth } from '../lib/helpers.js';
import { notifierTous } from '../lib/push.js';

const texte = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  let c;
  try { c = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }

  const d = {
    prenom: texte(c.prenom, 80), nom: texte(c.nom, 80), tel: texte(c.tel, 40),
    email: texte(c.email, 120), adresse: texte(c.adresse, 300), ville: texte(c.ville, 80),
    note: texte(c.note, 500)
  };
  if (!d.prenom || !d.nom || !d.tel || !d.adresse || !d.ville) {
    return erreur('Coordonnées incomplètes.');
  }
  const articles = Array.isArray(c.articles) ? c.articles.slice(0, 50) : [];
  if (!articles.length) return erreur('Aucun article dans la commande.');

  /* Le total est recalculé à partir des prix en base : on ne fait pas
     confiance aux montants envoyés par le navigateur. */
  let total = 0;
  const lignes = [];
  for (const a of articles) {
    const p = await env.DB.prepare('SELECT id, nom, prix FROM produits WHERE id = ?').bind(String(a.id)).first();
    if (!p) continue;
    const qte = Math.max(1, Math.min(99, parseInt(a.qte, 10) || 1));
    total += p.prix * qte;
    lignes.push({ id: p.id, nom: p.nom, taille: texte(a.taille, 30), couleur: texte(a.couleur, 40), qte, prix: p.prix });
  }
  if (!lignes.length) return erreur('Articles introuvables.');

  const res = await env.DB.prepare(
    `INSERT INTO commandes (prenom,nom,tel,email,adresse,ville,note,articles,total)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(d.prenom, d.nom, d.tel, d.email, d.adresse, d.ville, d.note,
         JSON.stringify(lignes), total).run();

  const id = res.meta.last_row_id;
  const resume = lignes.map(l => `${l.qte} × ${l.nom}`).join(', ');
  const montant = new Intl.NumberFormat('fr-FR').format(total) + ' FCFA';

  /* La notification ne doit jamais faire échouer la commande. */
  try {
    await notifierTous(env, '🛍️ Nouvelle commande',
      `${d.prenom} ${d.nom} — ${montant}\n${resume}`, { commandeId: id });
  } catch (e) { /* commande enregistrée quand même */ }

  return json({ id, total }, 201);
}

export async function onRequestGet({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  const { results } = await env.DB.prepare(
    'SELECT * FROM commandes ORDER BY cree_le DESC, id DESC LIMIT 200'
  ).all();
  return json(results.map(c => ({
    ...c,
    articles: (() => { try { return JSON.parse(c.articles); } catch (e) { return []; } })()
  })));
}
