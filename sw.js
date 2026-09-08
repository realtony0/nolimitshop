/* ==========================================================================
   NOLIMIT SHOP — service worker du back-office
   Sert à deux choses : rendre l'application installable sur l'écran d'accueil,
   et recevoir les notifications de nouvelles commandes même quand elle est
   fermée.
   Rien n'est mis en cache : le back-office doit toujours afficher les données
   à jour de la base.
   ========================================================================== */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = { titre: 'Nolimit Shop', texte: 'Nouvelle activité sur la boutique.' };
  try { if (event.data) d = { ...d, ...event.data.json() }; } catch (e) { /* format inattendu */ }

  event.waitUntil(self.registration.showNotification(d.titre, {
    body: d.texte,
    icon: '/assets/img/icon-192.png',
    badge: '/assets/img/icon-192.png',
    tag: d.commandeId ? `commande-${d.commandeId}` : 'nolimit',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/admin.html' }
  }));
});

/* Un clic sur la notification ramène sur le back-office (onglet déjà ouvert
   si possible, plutôt que d'en ouvrir un nouveau). */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const cible = (event.notification.data && event.notification.data.url) || '/admin.html';
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (f.url.includes('/admin.html')) return f.focus();
    }
    return self.clients.openWindow(cible);
  })());
});
