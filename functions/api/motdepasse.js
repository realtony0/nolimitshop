/* PUT /api/motdepasse — change le mot de passe du back-office. */
import { json, erreur, exigerAuth } from '../lib/helpers.js';

export async function onRequestPut({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let body;
  try { body = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  const nouveau = String(body.motdepasse || '').trim();
  if (nouveau.length < 6) return erreur('Le mot de passe doit contenir au moins 6 caractères.');

  await env.DB.prepare(
    "INSERT INTO settings (key,value) VALUES ('admin_password',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).bind(nouveau).run();
  return json({ ok: true });
}
