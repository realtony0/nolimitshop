/* /api/categories/:id — modification (PUT) et suppression (DELETE). */
import { json, erreur, exigerAuth } from '../../lib/helpers.js';

export async function onRequestPut({ request, env, params }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  const existant = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(params.id).first();
  if (!existant) return erreur('Catégorie introuvable.', 404);

  let c;
  try { c = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }

  await env.DB.prepare('UPDATE categories SET nom=?, emoji=? WHERE id=?')
    .bind(c.nom ?? existant.nom, c.emoji ?? existant.emoji, params.id).run();
  return json({ id: params.id, nom: c.nom ?? existant.nom, emoji: c.emoji ?? existant.emoji });
}

export async function onRequestDelete({ request, env, params }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  /* On refuse de supprimer une catégorie encore utilisée : sinon les articles
     concernés se retrouveraient sans catégorie visible sur le site. */
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM produits WHERE categorie = ?')
    .bind(params.id).first();
  if ((used.n | 0) > 0) {
    return erreur(`${used.n} article(s) utilisent encore cette catégorie. Changez-les d'abord de catégorie.`, 409);
  }

  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(params.id).run();
  return json({ supprime: params.id });
}
