# Nolimit Shop — site de vente

Boutique de prêt-à-porter (femme & homme) au Sénégal.
Site statique HTML/CSS/JS, sans framework, sans base de données.
Catalogue + panier + commande envoyée sur **WhatsApp**, paiement à la livraison.

## Lancer le site en local

```bash
python3 -m http.server 4173
```

Puis ouvrir http://localhost:4173
⚠️ Ne jamais ouvrir `index.html` en double-clic (`file://`) : le CSS et le JS sont bloqués par le navigateur.

## Back-office (recommandé)

Un espace d'administration visuel est disponible : **[admin.html](admin.html)**
(ouvrir `http://localhost:4173/admin.html` pendant que le site tourne en local).

- Mot de passe par défaut : `nolimit2026` (à changer dans l'onglet **Boutique** dès que possible).
- Permet de gérer produits, catégories, livraison, informations de la boutique et FAQ/avis sans toucher au code.
- **Connecter le dossier du site** (onglet Publier) : autorise le back-office à écrire directement dans `assets/js/config.js` et dans `assets/img/` (photos). Fonctionne avec Google Chrome ou Microsoft Edge — pas avec Safari.
- Sans cette connexion, l'onglet Publier propose de copier ou télécharger le fichier `config.js` généré, à coller manuellement.
- ⚠️ Ce mot de passe protège uniquement l'accès à cette page depuis le navigateur — ce n'est pas une sécurité serveur. Ne partage jamais le lien `admin.html`.

Tant que le back-office n'est pas utilisé, tout reste modifiable à la main (méthode ci-dessous).

## Ce qu'il faut modifier

Tout le contenu du site est dans **un seul fichier** : `assets/js/config.js`

| À changer | Où |
|---|---|
| Numéro WhatsApp, téléphone, e-mail, réseaux sociaux | `boutique` |
| Frais et délais de livraison, livraison offerte | `livraison` |
| Catégories affichées en filtres | `categories` |
| Articles : prix, promo, stock, tailles, couleurs, photos | `produits` |
| Arguments « pourquoi nous » | `atouts` |
| Questions fréquentes | `faq` |

### Ajouter un article
Copier un bloc `{ ... }` entier dans `produits`, le coller à la suite, puis changer l'`id` (il doit rester unique).

### Ajouter les photos
Déposer les images dans `assets/img/` et écrire le chemin dans `images: [...]`.
Format portrait 3/4, largeur ~900 px. Tant qu'une photo manque, un visuel de remplacement s'affiche.

## Catalogue actuel (4 articles)

| Article | Catégorie | Prix affiché* |
|---|---|---|
| Chemise Saved By Jesus | Chemises | 18 000 FCFA |
| Chemise Desert Tour brodée | Chemises | 32 000 FCFA |
| Chemise rayée Corteiz | Chemises | 20 000 FCFA (barré 25 000) |
| Polo Risky Private Club | Polos | 22 000 FCFA |

\* **prix d'exemple** — à remplacer par les vrais dans `assets/js/config.js`.

## À faire avant la mise en ligne

- [ ] Remplacer le numéro WhatsApp `221770000000` par le vrai numéro (format international, sans `+` ni espaces)
- [ ] Mettre les vrais prix et le vrai stock
- [ ] Ajouter les autres photos de chaque article (2 ou 3 vues : dos, porté, détail)
- [ ] Vérifier l'e-mail et les liens Instagram / TikTok dans `boutique`
- [ ] Remplacer `assets/img/og-image.jpg` (image de partage, idéalement 1200 × 630 px)

## Mise en ligne

Le site est 100 % statique : le dossier peut être déposé tel quel sur Netlify
(glisser-déposer sur app.netlify.com), Vercel, ou n'importe quel hébergement.
