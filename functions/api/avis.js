/* /api/avis — remplace toute la liste des avis clients d'un coup. */
import { json, erreur, exigerAuth } from '../lib/helpers.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT texte, nom FROM avis ORDER BY ordre').all();
  return json(results);
}

export async function onRequestPut({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let liste;
  try { liste = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  if (!Array.isArray(liste)) return erreur('Une liste est attendue.');

  const ops = [env.DB.prepare('DELETE FROM avis')];
  liste.forEach((a, i) => {
    if (!a || !String(a.texte || '').trim()) return;
    ops.push(env.DB.prepare('INSERT INTO avis (texte,nom,ordre) VALUES (?,?,?)')
      .bind(String(a.texte).trim(), String(a.nom || '').trim(), i));
  });
  await env.DB.batch(ops);
  return json(liste);
}
