/* ==========================================================================
   NOLIMIT SHOP — envoi de notifications Web Push depuis Cloudflare Workers
   --------------------------------------------------------------------------
   Implémente ce qu'il faut de la norme Web Push (RFC 8291 pour le chiffrement,
   RFC 8292 pour la signature VAPID) avec la Web Crypto API, pour éviter une
   dépendance externe qui ne tournerait pas dans un Worker.
   ========================================================================== */

const b64urlVersOctets = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};
const octetsVersB64url = buf => {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const concat = (...tab) => {
  const total = tab.reduce((n, t) => n + t.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const t of tab) { out.set(t, o); o += t.length; }
  return out;
};
const enc = new TextEncoder();

/* --- signature VAPID : un JWT ES256 qui prouve l'identité de l'expéditeur -- */
async function jetonVapid(audience, jwkPrive, sujet) {
  const cle = await crypto.subtle.importKey('jwk', { ...jwkPrive, ext: true, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const entete = octetsVersB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corps = octetsVersB64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: sujet
  })));
  const aSigner = enc.encode(`${entete}.${corps}`);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, aSigner);
  return `${entete}.${corps}.${octetsVersB64url(sig)}`;
}

/* --- chiffrement du contenu (aes128gcm) ---------------------------------- */
async function hkdf(sel, ikm, info, longueur) {
  const cle = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sel, info }, cle, longueur * 8));
}

async function chiffrer(message, p256dhClient, authClient) {
  const cleClient = b64urlVersOctets(p256dhClient);
  const secretAuth = b64urlVersOctets(authClient);

  /* paire de clés éphémère du serveur */
  const paire = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pubServeur = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey));

  const pubClient = await crypto.subtle.importKey('raw', cleClient,
    { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const partage = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: pubClient }, paire.privateKey, 256));

  const sel = crypto.getRandomValues(new Uint8Array(16));
  const infoPrk = concat(enc.encode('WebPush: info\0'), cleClient, pubServeur);
  const prk = await hkdf(secretAuth, partage, infoPrk, 32);

  const cleContenu = await hkdf(sel, prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sel, prk, enc.encode('Content-Encoding: nonce\0'), 12);

  const cleAes = await crypto.subtle.importKey('raw', cleContenu, 'AES-GCM', false, ['encrypt']);
  const donnees = concat(enc.encode(message), new Uint8Array([2])); /* 2 = marqueur de fin */
  const chiffre = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, cleAes, donnees));

  /* en-tête aes128gcm : sel(16) + taille d'enregistrement(4) + taille clé(1) + clé */
  const entete = new Uint8Array(16 + 4 + 1 + pubServeur.length);
  entete.set(sel, 0);
  new DataView(entete.buffer).setUint32(16, 4096);
  entete[20] = pubServeur.length;
  entete.set(pubServeur, 21);

  return concat(entete, chiffre);
}

/* --- envoi à un abonné ---------------------------------------------------- */
export async function envoyerPush(abonne, message, vapidPublic, vapidPriveJwk, sujet) {
  const url = new URL(abonne.endpoint);
  const jwt = await jetonVapid(url.origin, vapidPriveJwk, sujet);
  const corps = await chiffrer(message, abonne.p256dh, abonne.auth);

  return fetch(abonne.endpoint, {
    method: 'POST',
    headers: {
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      'ttl': '86400',
      'urgency': 'high',
      'authorization': `vapid t=${jwt}, k=${vapidPublic}`
    },
    body: corps
  });
}

/* Notifie tous les appareils abonnés ; retire ceux que le service de push
   déclare expirés (404/410) pour ne pas garder d'abonnements morts. */
export async function notifierTous(env, titre, texte, donnees = {}) {
  const [pub, priv, abonnes] = await Promise.all([
    env.DB.prepare("SELECT value FROM settings WHERE key='vapid_public'").first(),
    env.DB.prepare("SELECT value FROM settings WHERE key='vapid_private'").first(),
    env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_abonnes').all()
  ]);
  if (!pub || !priv || !abonnes.results.length) return { envoyees: 0 };

  const message = JSON.stringify({ titre, texte, ...donnees });
  const jwk = JSON.parse(priv.value);
  let envoyees = 0;

  for (const a of abonnes.results) {
    try {
      const r = await envoyerPush(a, message, pub.value, jwk, 'mailto:contact@nolimiteshop.com');
      if (r.status === 404 || r.status === 410) {
        await env.DB.prepare('DELETE FROM push_abonnes WHERE endpoint = ?').bind(a.endpoint).run();
      } else if (r.ok) envoyees++;
    } catch (e) { /* un appareil injoignable ne doit pas bloquer les autres */ }
  }
  return { envoyees };
}
