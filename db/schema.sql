-- ============================================================================
-- NOLIMIT SHOP — schéma de la base de données (Cloudflare D1 / SQLite)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id     TEXT PRIMARY KEY,
  nom    TEXT NOT NULL,
  emoji  TEXT DEFAULT '',
  ordre  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produits (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  sous_titre  TEXT DEFAULT '',
  categorie   TEXT NOT NULL,
  prix        INTEGER NOT NULL DEFAULT 0,
  prix_barre  INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 1,
  vedette     INTEGER NOT NULL DEFAULT 0,
  badge       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  tailles     TEXT NOT NULL DEFAULT '[]',   -- JSON array
  couleurs    TEXT NOT NULL DEFAULT '[]',   -- JSON array
  details     TEXT NOT NULL DEFAULT '[]',   -- JSON array
  images      TEXT NOT NULL DEFAULT '[]',   -- JSON array
  ordre       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS livraison_zones (
  id     TEXT PRIMARY KEY,
  nom    TEXT NOT NULL,
  frais  INTEGER NOT NULL DEFAULT 0,
  delai  TEXT DEFAULT '',
  ordre  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faq (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  q      TEXT NOT NULL,
  r      TEXT NOT NULL,
  ordre  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS avis (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  texte  TEXT NOT NULL,
  nom    TEXT NOT NULL,
  ordre  INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Commandes envoyées depuis le site (enregistrées avant l'ouverture de WhatsApp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commandes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom     TEXT NOT NULL,
  nom        TEXT NOT NULL,
  tel        TEXT NOT NULL,
  email      TEXT DEFAULT '',
  adresse    TEXT NOT NULL,
  ville      TEXT NOT NULL,
  note       TEXT DEFAULT '',
  articles   TEXT NOT NULL DEFAULT '[]',   -- JSON : [{id,nom,taille,couleur,qte,prix}]
  total      INTEGER NOT NULL DEFAULT 0,
  statut     TEXT NOT NULL DEFAULT 'nouvelle',  -- nouvelle | vue | confirmee | annulee
  cree_le    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE INDEX IF NOT EXISTS idx_commandes_date ON commandes(cree_le DESC);

-- Abonnements aux notifications push du back-office
CREATE TABLE IF NOT EXISTS push_abonnes (
  endpoint TEXT PRIMARY KEY,
  p256dh   TEXT NOT NULL,
  auth     TEXT NOT NULL,
  cree_le  TEXT NOT NULL DEFAULT (datetime('now'))
);
