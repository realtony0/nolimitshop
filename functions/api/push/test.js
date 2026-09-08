/* POST /api/push/test — envoie une notification de test aux appareils abonnés,
   pour vérifier que tout fonctionne depuis le back-office. */
import { json, exigerAuth } from '../../lib/helpers.js';
import { notifierTous } from '../../lib/push.js';

export async function onRequestPost({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;
  const r = await notifierTous(env, '🔔 Test Nolimit Shop',
    'Les notifications fonctionnent : tu recevras les commandes ici.');
  return json(r);
}
