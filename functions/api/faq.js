/* /api/faq — remplace toute la liste des questions fréquentes d'un coup.
   La FAQ est courte : la réécrire entièrement est plus simple et évite de
   gérer des identifiants côté back-office. */
import { json, erreur, exigerAuth } from '../lib/helpers.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT q, r FROM faq ORDER BY ordre').all();
  return json(results);
}

export async function onRequestPut({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let liste;
  try { liste = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  if (!Array.isArray(liste)) return erreur('Une liste est attendue.');

  const ops = [env.DB.prepare('DELETE FROM faq')];
  liste.forEach((f, i) => {
    if (!f || !String(f.q || '').trim()) return;
    ops.push(env.DB.prepare('INSERT INTO faq (q,r,ordre) VALUES (?,?,?)')
      .bind(String(f.q).trim(), String(f.r || '').trim(), i));
  });
  await env.DB.batch(ops);
  return json(liste);
}
