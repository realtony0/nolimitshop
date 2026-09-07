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
    whatsapp: "221770321603",
    // Lien WhatsApp court de la boutique (utilisé tant que le numéro est vide).
    whatsappLien: "https://wa.me/message/Z65TGEO5YBMUD1",
    // Laisser vide "" tant que l'information n'est pas confirmée : le site
    // n'affiche que ce qui est réellement renseigné ici, rien n'est deviné.
    telephone: "",
    email: "",
    adresse: "Dakar, Sénégal",
    horaires: "",

    // Laisser vide "" pour cacher le lien
    instagram: "https://www.instagram.com/no_limite_shop221",
    tiktok: "https://www.tiktok.com/@nolimiteshop3",
    snapchat: "https://snapchat.com/t/cJXjTP5j",
    facebook: ""
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
    { icone: "check",  titre: "Qualité vérifiée",      texte: "Chaque article est contrôlé avant l'expédition." },
    { icone: "chat",   titre: "Conseil sur WhatsApp",  texte: "Une question sur la taille ? Écrivez-nous directement." }
    // Ajouter ici un argument (livraison, paiement, échange...) seulement une
    // fois la politique réellement décidée — ne jamais deviner un délai ou un
    // mode de paiement qui n'a pas été confirmé.
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
      r: "Ajoutez vos articles au panier, cliquez sur « Commander », remplissez vos coordonnées : votre commande part directement sur notre WhatsApp. On vous recontacte ensuite pour confirmer les détails (livraison, paiement)."
    },
    {
      q: "Comment choisir ma taille ?",
      r: "Chaque fiche produit indique les tailles disponibles. En cas de doute, écrivez-nous sur WhatsApp avec votre taille habituelle, nous vous conseillons."
    }
    // Pour ajouter une question sur les délais, le paiement ou les échanges,
    // copier un bloc { q: "...", r: "..." } ci-dessus — mais uniquement avec
    // une réponse vraie et confirmée par la boutique, jamais une estimation.
  ]
};
