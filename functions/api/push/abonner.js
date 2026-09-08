/* POST /api/push/abonner — enregistre un appareil pour les notifications.
   DELETE — le désabonne. */
import { json, erreur, exigerAuth } from '../../lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let s;
  try { s = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  const cles = s.keys || {};
  if (!s.endpoint || !cles.p256dh || !cles.auth) return erreur('Abonnement incomplet.');

  await env.DB.prepare(
    `INSERT INTO push_abonnes (endpoint,p256dh,auth) VALUES (?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth`
  ).bind(s.endpoint, cles.p256dh, cles.auth).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;
  let s;
  try { s = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  await env.DB.prepare('DELETE FROM push_abonnes WHERE endpoint = ?').bind(s.endpoint || '').run();
  return json({ ok: true });
}
