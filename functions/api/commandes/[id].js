/* PUT /api/commandes/:id — change le statut d'une commande (vue, confirmée…). */
import { json, erreur, exigerAuth } from '../../lib/helpers.js';

const STATUTS = ['nouvelle', 'vue', 'confirmee', 'annulee'];

export async function onRequestPut({ request, env, params }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let body;
  try { body = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  if (!STATUTS.includes(body.statut)) return erreur('Statut inconnu.');

  await env.DB.prepare('UPDATE commandes SET statut = ? WHERE id = ?')
    .bind(body.statut, params.id).run();
  return json({ id: params.id, statut: body.statut });
}

export async function onRequestDelete({ request, env, params }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;
  await env.DB.prepare('DELETE FROM commandes WHERE id = ?').bind(params.id).run();
  return json({ supprime: params.id });
}
