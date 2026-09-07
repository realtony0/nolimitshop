/* /api/boutique — informations de la boutique (nom, WhatsApp, réseaux…). */
import { json, erreur, exigerAuth } from '../lib/helpers.js';

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='boutique'").first();
  return json(row ? JSON.parse(row.value) : {});
}

export async function onRequestPut({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let b;
  try { b = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }

  await env.DB.prepare(
    "INSERT INTO settings (key,value) VALUES ('boutique',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).bind(JSON.stringify(b)).run();
  return json(b);
}
