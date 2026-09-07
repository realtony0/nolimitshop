/* ==========================================================================
   NOLIMIT SHOP — utilitaires partagés par les fonctions API (Cloudflare Pages)
   ========================================================================== */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export function erreur(message, status = 400) {
  return json({ erreur: message }, status);
}

/** Vérifie l'en-tête Authorization: Bearer <mot de passe admin> contre la valeur
 *  stockée dans la table settings. Utilisé sur toutes les routes qui modifient
 *  des données (POST/PUT/DELETE). */
export async function verifierAuth(request, env) {
  const header = request.headers.get('authorization') || '';
  const fourni = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!fourni) return false;
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_password'").first();
  const attendu = row ? row.value : 'nolimit2026';
  return fourni === attendu;
}

export async function exigerAuth(request, env) {
  const ok = await verifierAuth(request, env);
  if (!ok) return erreur('Mot de passe invalide ou manquant.', 401);
  return null; // null = autorisé
}

export const parseArr = s => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };

export function produitVersJson(row) {
  return {
    id: row.id,
    nom: row.nom,
    sousTitre: row.sous_titre || '',
    categorie: row.categorie,
    prix: row.prix,
    prixBarre: row.prix_barre,
    stock: !!row.stock,
    vedette: !!row.vedette,
    badge: row.badge || '',
    description: row.description || '',
    tailles: parseArr(row.tailles),
    couleurs: parseArr(row.couleurs),
    details: parseArr(row.details),
    images: parseArr(row.images)
  };
}

export const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');

export async function idUnique(env, table, base) {
  let id = base || 'item', n = 2;
  while (true) {
    const row = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(id).first();
    if (!row) return id;
    id = `${base}-${n++}`;
  }
}
