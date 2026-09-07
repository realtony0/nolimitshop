/* POST /api/upload — envoi d'une photo produit.
   Le fichier est stocké dans le bucket R2 et servi ensuite par /img/<clé>. */
import { json, erreur, exigerAuth, slugify } from '../lib/helpers.js';

const TYPES_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const TAILLE_MAX = 8 * 1024 * 1024; // 8 Mo

export async function onRequestPost({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let form;
  try { form = await request.formData(); } catch (e) { return erreur('Envoi invalide.'); }

  const fichier = form.get('fichier');
  if (!fichier || typeof fichier === 'string') return erreur('Aucun fichier reçu.');
  if (!TYPES_OK.includes(fichier.type)) {
    return erreur('Format non accepté. Utilise une image JPG, PNG, WEBP, AVIF ou GIF.');
  }
  if (fichier.size > TAILLE_MAX) return erreur('Photo trop lourde (8 Mo maximum).');

  const ext = (fichier.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const base = slugify(form.get('nom') || fichier.name.replace(/\.[^.]+$/, '')) || 'photo';
  const cle = `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  await env.PHOTOS.put(cle, fichier.stream(), {
    httpMetadata: { contentType: fichier.type, cacheControl: 'public, max-age=31536000, immutable' }
  });

  return json({ chemin: `/img/${cle}`, cle }, 201);
}
