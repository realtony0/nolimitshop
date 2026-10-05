/* /api/produits — liste (GET) et création (POST) des articles. */
import { json, erreur, exigerAuth, produitVersJson, slugify, idUnique } from '../lib/helpers.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM produits ORDER BY ordre DESC').all();
  return json(results.map(produitVersJson));
}

export async function onRequestPost({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let p;
  try { p = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  if (!p.nom || !String(p.nom).trim()) return erreur("Le nom de l'article est obligatoire.");
  if (!p.categorie) return erreur('La catégorie est obligatoire.');

  const id = await idUnique(env, 'produits', slugify(p.nom));
  const max = await env.DB.prepare('SELECT COALESCE(MAX(ordre), -1) AS m FROM produits').first();

  await env.DB.prepare(
    `INSERT INTO produits (id,nom,sous_titre,categorie,prix,prix_barre,stock,vedette,badge,
       description,tailles,couleurs,details,images,ordre)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, String(p.nom).trim(), p.sousTitre || '', p.categorie,
    Number(p.prix) || 0, Number(p.prixBarre) || 0,
    p.stock === false ? 0 : 1, p.vedette ? 1 : 0, p.badge || '', p.description || '',
    JSON.stringify(p.tailles || []), JSON.stringify(p.couleurs || []),
    JSON.stringify(p.details || []), JSON.stringify(p.images || []),
    (max.m | 0) + 1
  ).run();

  const row = await env.DB.prepare('SELECT * FROM produits WHERE id = ?').bind(id).first();
  return json(produitVersJson(row), 201);
}
