/* ==========================================================================
   NOLIMIT SHOP — FICHIER DE CONFIGURATION
   --------------------------------------------------------------------------
   C'EST LE SEUL FICHIER À MODIFIER AU QUOTIDIEN :
   numéro WhatsApp, prix, stock, photos, tailles, nouveaux articles.
   Aucune connaissance en code nécessaire : on change seulement les valeurs
   entre guillemets " " ou les nombres.
   ⚠️ Ne pas supprimer les virgules ni les accolades { }.
   ========================================================================== */

window.CONFIG = {

  /* ---------------------------------------------------------------- BOUTIQUE */
  boutique: {
    nom: "Nolimit Shop",
    slogan: "La mode sans limite, livrée chez toi",
    description: "Chemises & polos oversize — Dakar, Sénégal",

    // Numéro WhatsApp au format international SANS "+" ni espaces (ex : "221771234567").
    // Dès qu'il est rempli, les commandes arrivent PRÉ-REMPLIES dans WhatsApp.
    whatsapp: "",
    // Lien WhatsApp court de la boutique (utilisé tant que le numéro est vide).
    whatsappLien: "https://wa.me/message/Z65TGEO5YBMUD1",
    telephone: "+221 77 000 00 00",
    email: "contact@nolimitshop.sn",
    adresse: "Dakar, Sénégal",
    horaires: "Tous les jours de 9h à 21h",

    // Laisser vide "" pour cacher le lien
    instagram: "https://www.instagram.com/no_limite_shop221",
    tiktok: "https://www.tiktok.com/@nolimiteshop3",
    snapchat: "https://snapchat.com/t/cJXjTP5j",
    facebook: ""
  },

  /* --------------------------------------------------------------- LIVRAISON
     Les zones apparaissent dans le formulaire de commande.
     frais : en FCFA (mettre 0 pour "gratuit")
  -------------------------------------------------------------------------- */
  livraison: {
    gratuiteApartir: 50000,   // livraison offerte au-dessus de ce montant (0 = désactivé)
    zones: [
      { id: "dakar",    nom: "Dakar (centre)",          frais: 1500, delai: "24h" },
      { id: "banlieue", nom: "Banlieue dakaroise",      frais: 2000, delai: "24h" },
      { id: "regions",  nom: "Régions (autres villes)", frais: 3000, delai: "48 à 72h" }
    ]
  },

  /* -------------------------------------------------------------- CATÉGORIES
     L'ordre ici = l'ordre des filtres sur le site.
     "id" doit correspondre au champ "categorie" des produits.
  -------------------------------------------------------------------------- */
  categories: [
    { id: "chemises",    nom: "Chemises",    emoji: "👕" },
    { id: "polos",       nom: "Polos",       emoji: "👔" }
    // Pour ajouter une catégorie (ex : pantalons), copier une ligne ci-dessus,
    // changer l'id et le nom, puis utiliser ce même id dans les produits.
  ],

  /* ---------------------------------------------------------------- PRODUITS
     Pour ajouter un article : copier un bloc { ... } entier, le coller à la
     suite et changer l'id (il doit rester UNIQUE).

     prix       : prix de vente en FCFA  ⚠️ ce sont des prix d'exemple, à corriger
     prixBarre  : ancien prix affiché barré (0 = pas de promo)
     stock      : true = disponible / false = rupture
     vedette    : true = mis en avant (non utilisé pour l'instant)
     badge      : petit texte sur la photo ("Nouveau", "-20%", "" pour rien)
     tailles    : [] si l'article n'a pas de taille
     couleurs   : [] si une seule couleur
     images     : photos dans assets/img/. Si la photo n'existe pas encore,
                  un visuel de remplacement s'affiche — le site ne casse pas.
  -------------------------------------------------------------------------- */
  produits: [
    {
      id: "chemise-saved-by-jesus",
      nom: "Chemise Saved By Jesus",
      sousTitre: "Coupe oversize, carreaux noir & blanc",
      categorie: "chemises",
      prix: 18000,
      prixBarre: 0,
      stock: true,
      vedette: true,
      badge: "Nouveau",
      description:
        "Chemise à manches courtes coupe oversize, tissu à carreaux noir et blanc, " +
        "gros lettrage jaune « SAVED BY JESUS » sur le devant. Une pièce forte qui " +
        "se porte ouverte sur un t-shirt ou fermée.",
      tailles: ["M", "L", "XL", "XXL"],
      couleurs: ["Noir / Blanc"],
      details: [
        "Coupe oversize (boxy)",
        "Manches courtes, col chemise",
        "Impression jaune effet vintage",
        "Tissu léger, agréable par forte chaleur"
      ],
      images: ["assets/img/chemise-saved-by-jesus-1.jpg"]
    },
    {
      id: "chemise-desert-tour",
      nom: "Chemise Desert Tour brodée",
      sousTitre: "Broderie intégrale, boutons pression",
      categorie: "chemises",
      prix: 32000,
      prixBarre: 0,
      stock: true,
      vedette: true,
      badge: "Pièce rare",
      description:
        "Chemise oversize entièrement brodée : paysage désert, cactus et ciel " +
        "orangé, empiècements turquoise et rouge. Fermeture à boutons pression. " +
        "Une pièce statement, aucune autre ne lui ressemble.",
      tailles: ["M", "L", "XL"],
      couleurs: ["Multicolore"],
      details: [
        "Broderie sur toute la surface",
        "Boutons pression métal",
        "Coupe oversize courte",
        "Intérieur doublé"
      ],
      images: ["assets/img/chemise-desert-tour-1.jpg"]
    },
    {
      id: "chemise-corteiz-rose",
      nom: "Chemise rayée Corteiz",
      sousTitre: "Rayures rose & noir, logo floqué",
      categorie: "chemises",
      prix: 20000,
      prixBarre: 25000,
      stock: true,
      vedette: true,
      badge: "Promo",
      description:
        "Chemise oversize à rayures rose et noir avec gros logo Corteiz floqué " +
        "au centre et petit logo en bas. Poche poitrine. Le streetwear qui se " +
        "remarque.",
      tailles: ["M", "L", "XL", "XXL"],
      couleurs: ["Rose / Noir"],
      details: [
        "Coupe oversize (boxy)",
        "Poche poitrine",
        "Logo floqué effet relief",
        "Tissu fluide"
      ],
      images: ["assets/img/chemise-corteiz-rose-1.jpg"]
    },
    {
      id: "polo-risky-argyle",
      nom: "Polo Risky Private Club",
      sousTitre: "Maille argyle bordeaux, beige & blanc",
      categorie: "polos",
      prix: 22000,
      prixBarre: 0,
      stock: true,
      vedette: true,
      badge: "Nouveau",
      description:
        "Polo en maille motif argyle (losanges) bordeaux, beige et blanc, avec " +
        "broderie « Risky Private Club » et écusson drapeau. Col et poignets " +
        "contrastés. Chic et décontracté à la fois.",
      tailles: ["M", "L", "XL"],
      couleurs: ["Bordeaux / Beige"],
      details: [
        "Maille jacquard motif argyle",
        "Broderies et écusson appliqué",
        "Col et poignets en velours côtelé",
        "Fermeture 3 boutons pression"
      ],
      images: ["assets/img/polo-risky-argyle-1.jpg"]
    }
  ],

  /* ------------------------------------------------------------- ARGUMENTS
     Les 4 blocs "pourquoi nous choisir" affichés sous le catalogue.
  -------------------------------------------------------------------------- */
  atouts: [
    { icone: "truck",  titre: "Livraison rapide",      texte: "24h à Dakar et banlieue, 48-72h dans les autres régions." },
    { icone: "cash",   titre: "Payez à la livraison",  texte: "Vous ne payez qu'une fois le colis entre vos mains." },
    { icone: "check",  titre: "Qualité vérifiée",      texte: "Chaque article est contrôlé avant l'expédition." },
    { icone: "chat",   titre: "Conseil sur WhatsApp",  texte: "Une question sur la taille ? On répond en quelques minutes." }
  ],

  /* ---------------------------------------------------------------- AVIS
     Avis clients affichés sur la page d'accueil.
     ⚠️ Ne mettre QUE de vrais avis de vrais clients.
     Tant que la liste est vide, la section n'apparaît pas sur le site.

     Format (copier une ligne et remplir) :
       { texte: "Livraison rapide, la chemise est encore plus belle en vrai.", nom: "Awa D." },
  -------------------------------------------------------------------------- */
  avis: [],

  /* -------------------------------------------------------------------- FAQ */
  faq: [
    {
      q: "Comment passer commande ?",
      r: "Ajoutez vos articles au panier, cliquez sur « Commander », remplissez vos coordonnées : votre commande part directement sur notre WhatsApp. Nous vous confirmons ensuite le rendez-vous de livraison."
    },
    {
      q: "Quand est-ce que je paie ?",
      r: "À la livraison, en espèces au livreur. Wave et Orange Money sont aussi acceptés si vous préférez."
    },
    {
      q: "Quels sont les délais de livraison ?",
      r: "24h à Dakar et en banlieue, 48 à 72h pour les autres régions du Sénégal."
    },
    {
      q: "Puis-je échanger un article ?",
      r: "Oui, l'échange est possible sous 48h si l'article n'a pas été porté et qu'il a encore son étiquette. Une erreur de taille se règle sans problème."
    },
    {
      q: "Comment choisir ma taille ?",
      r: "Chaque fiche produit indique les tailles disponibles. En cas de doute, écrivez-nous sur WhatsApp avec votre taille habituelle, nous vous conseillons."
    }
  ]
};
