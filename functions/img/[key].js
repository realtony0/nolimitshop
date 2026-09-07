/* GET /img/:key — sert une photo stockée dans le bucket R2. */
export async function onRequestGet({ env, params }) {
  const objet = await env.PHOTOS.get(params.key);
  if (!objet) return new Response('Photo introuvable', { status: 404 });

  const headers = new Headers();
  objet.writeHttpMetadata(headers);
  headers.set('etag', objet.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(objet.body, { headers });
}
