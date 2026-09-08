/* GET /api/push/cle — clé publique VAPID, nécessaire au navigateur pour
   créer un abonnement aux notifications. */
import { json, erreur } from '../../lib/helpers.js';

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='vapid_public'").first();
  if (!row) return erreur('Notifications non configurées.', 503);
  return json({ cle: row.value });
}
