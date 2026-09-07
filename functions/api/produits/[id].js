/* /api/produits/:id — modification (PUT) et suppression (DELETE) d'un article. */
import { json, erreur, exigerAuth, produitVersJson } from '../../lib/helpers.js';

export async function onRequestPut({ request, env, params }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  const existant = await env.DB.prepare('SELECT * FROM produits WHERE id = ?').bind(params.id).first();
  if (!existant) return erreur('Article introuvable.', 404);

  let p;
  try { p = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }

  await env.DB.prepare(
    `UPDATE produits SET nom=?, sous_titre=?, categorie=?, prix=?, prix_barre=?, stock=?,
       vedette=?, badge=?, description=?, tailles=?, couleurs=?, details=?, images=?
     WHERE id = ?`
  ).bind(
    p.nom ?? existant.nom, p.sousTitre ?? existant.sous_titre, p.categorie ?? existant.categorie,
    Number(p.prix) || 0, Number(p.prixBarre) || 0, p.stock === false ? 0 : 1,
    p.vedette ? 1 : 0, p.badge || '', p.description || '',
    JSON.stringify(p.tailles || []), JSON.stringify(p.couleurs || []),
    JSON.stringify(p.details || []), JSON.stringify(p.images || []),
    params.id
  ).run();

  const row = await env.DB.prepare('SELECT * FROM produits WHERE id = ?').bind(params.id).first();
  return json(produitVersJson(row));
}

export async function onRequestDelete({ request, env, params }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;
  await env.DB.prepare('DELETE FROM produits WHERE id = ?').bind(params.id).run();
  return json({ supprime: params.id });
}
