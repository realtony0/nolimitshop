/* /api/categories — liste (GET) et création (POST) des catégories. */
import { json, erreur, exigerAuth, slugify, idUnique } from '../lib/helpers.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT id, nom, emoji FROM categories ORDER BY ordre').all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const refus = await exigerAuth(request, env);
  if (refus) return refus;

  let c;
  try { c = await request.json(); } catch (e) { return erreur('Corps de requête invalide.'); }
  if (!c.nom || !String(c.nom).trim()) return erreur('Le nom de la catégorie est obligatoire.');

  const id = await idUnique(env, 'categories', slugify(c.nom));
  const max = await env.DB.prepare('SELECT COALESCE(MAX(ordre), -1) AS m FROM categories').first();
  await env.DB.prepare('INSERT INTO categories (id,nom,emoji,ordre) VALUES (?,?,?,?)')
    .bind(id, String(c.nom).trim(), c.emoji || '', (max.m | 0) + 1).run();

  return json({ id, nom: String(c.nom).trim(), emoji: c.emoji || '' }, 201);
}
