/* GET /api/config — renvoie tout le contenu du site en une seule fois, dans le
   même format que window.CONFIG (assets/js/config.js), pour que le front-end
   n'ait qu'un seul endpoit à appeler. */
import { json, produitVersJson } from '../lib/helpers.js';

export async function onRequestGet({ env }) {
  const db = env.DB;

  const [boutiqueRow, gratuiteRow, categories, produits, zones, faq, avis] = await Promise.all([
    db.prepare("SELECT value FROM settings WHERE key = 'boutique'").first(),
    db.prepare("SELECT value FROM settings WHERE key = 'gratuite_apartir'").first(),
    db.prepare("SELECT id, nom, emoji FROM categories ORDER BY ordre").all(),
    db.prepare("SELECT * FROM produits ORDER BY ordre").all(),
    db.prepare("SELECT id, nom, frais, delai FROM livraison_zones ORDER BY ordre").all(),
    db.prepare("SELECT q, r FROM faq ORDER BY ordre").all(),
    db.prepare("SELECT texte, nom FROM avis ORDER BY ordre").all()
  ]);

  const boutique = boutiqueRow ? JSON.parse(boutiqueRow.value) : {};

  return json({
    boutique,
    livraison: {
      gratuiteApartir: Number((gratuiteRow || {}).value || 0),
      zones: zones.results
    },
    categories: categories.results,
    produits: produits.results.map(produitVersJson),
    // "atouts" reste défini en dur côté site (assets/js/config.js) : ce sont des
    // arguments marketing fixes, pas du contenu que la boutique modifie souvent.
    faq: faq.results,
    avis: avis.results
  });
}
