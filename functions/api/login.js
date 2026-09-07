/* POST /api/login — vérifie le mot de passe du back-office.
   Permet au navigateur de savoir si le mot de passe saisi est le bon avant
   d'afficher l'interface (la vraie protection reste côté serveur, sur chaque
   route qui modifie des données). */
import { json, erreur, verifierAuth } from '../lib/helpers.js';

export async function onRequestPost({ request, env }) {
  const ok = await verifierAuth(request, env);
  if (!ok) return erreur('Mot de passe incorrect.', 401);
  return json({ ok: true });
}
