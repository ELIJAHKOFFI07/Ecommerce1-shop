# Analyse UI/UX & Design — backmarket.fr

> Analyse réalisée le 17/08/2026 à partir de la home `fr-fr` (contenu + recherche sur l'identité de marque officielle). Les valeurs de couleur exactes (hex) et la CSS ne sont pas extractibles depuis un simple fetch de contenu — pour du pixel-perfect, ouvre l'inspecteur du navigateur sur le site et récupère les variables CSS directement.

---

## 1. Architecture de page (Information Architecture)

Structure verticale en 12 blocs, dans un ordre pensé pour la conversion progressive :

| # | Bloc | Rôle |
|---|------|------|
| 1 | Header (3 niveaux) | Navigation + recherche + compte |
| 2 | Hero carousel | Offres/promos tournantes |
| 3 | Bandeau réassurance (4 badges) | Confiance immédiate |
| 4 | Carousel catégories (pastilles) | Accès rapide produit |
| 5 | Grilles "Meilleures ventes" | Conversion directe |
| 6 | Sélection éditoriale | Découverte |
| 7 | Marques favorites (logos → produits) | Navigation par marque |
| 8 | Avis clients (17M+, photos réelles) | Preuve sociale |
| 9 | Contenu vidéo experts | Éducation / engagement |
| 10 | Tech Journal (blog) | SEO + storytelling de marque |
| 11 | FAQ accordéon | Levée d'objections |
| 12 | Presse + Footer riche | Crédibilité + navigation secondaire |

**Principe clé** : chaque bloc a un rôle de conversion précis, jamais de remplissage. La réassurance arrive tôt (bloc 3), pas en fin de page.

---

## 2. Système de couleurs

Back Market a fait un rebrand (Studio Herrström) qui **fait évoluer une base noir/blanc historique vers une palette plus vive avec dégradés**, tout en gardant :
- Un **fond dominant blanc/neutre clair** pour laisser respirer les photos produit
- Le **noir** comme couleur de texte principale et pour les CTA à fort contraste
- Des **accents colorés vifs** (utilisés par petites touches : badges "Baisse de prix", tags promo, accents de marque) plutôt qu'en fond de page
- Des **motifs circulaires et diagonaux** (le "chevron" de la marque) comme éléments graphiques de fond, pas comme couleur de contenu

**Logique appliquée** : couleur = signal, pas décor. Le badge rouge/orange "Baisse de prix" saute aux yeux précisément parce que 95% de la page reste neutre.

---

## 3. Typographie

D'après l'identité de marque officielle :
- **Ivar Soft** (Letters of Sweden) : typo "humaine", chaleureuse, pour contraster avec les sans-serifs froides des géants tech — utilisée pour l'expression de marque (titres, ton éditorial)
- **Duplet Open** : plus géométrique/structurée, en cohérence avec les motifs circulaires — probablement pour les titres/headings marquants
- Sur les pages produit/UI courante : une **sans-serif système lisible et dense** pour les prix, specs, labels — priorité à la lisibilité sur la personnalité

**Hiérarchie observée sur la home** :
- H1 très court, orienté bénéfice ("Ici, on s'offre le meilleur du reconditionné") plutôt que descriptif
- Sous-titres de section courts et directs ("Nos meilleures ventes", "Vos marques favorites")
- Prix toujours en plus gros/gras que le reste de la card produit

---

## 4. Composants UI clés (réutilisables)

### Card produit
```
[Badge état/promo]
[Image produit — fond neutre]
Nom du produit
État • Couleur • Capacité • Spec (une ligne condensée)
★ Note (nb avis)
Prix reconditionné (gras) — Économie Xx€
Prix "le plus bas" (référence, avec micro-légende légale)
[CTA "Ajouter au panier"]
```
C'est le composant le plus dense en information mais qui reste scannable en < 2 secondes.

### Mega-menu catégorie
Icône/image + libellé par sous-catégorie, plus un encart contextuel ("Gagnez jusqu'à 800€ en revendant") intégré au menu lui-même — le menu de nav devient un espace de cross-sell.

### Bandeau de réassurance
4 items horizontaux, icône + texte court, pas de description longue. Format répété partout où la confiance doit être rappelée (avant checkout, sur fiche produit).

### FAQ accordéon
Questions formulées à la 1ère personne ("Pouvez-vous m'aider à...", "Est-ce que je peux..."), réponses courtes avec liens internes en gras vers les pages de service concernées.

### Carousel de preuve sociale
Photo client réelle + prénom + initiale nom + verbatim + note + photo du produit acheté + nom exact du produit. Le lien produit→avis→re-achat est explicite.

---

## 5. Imagerie & style visuel

- **Photos produit sur fond neutre uni** (studio), cohérence totale entre catégories
- **Photos clients "vraies"** (pas de stock photo lissé) dans la section avis — renforce l'authenticité
- **Vidéos verticales** (format mobile natif, 9:16) utilisées même en contexte desktop — signe d'une stratégie mobile-first assumée jusque dans le choix de format
- Logos de marques partenaires en niveaux de gris/simplifiés dans les carousels de navigation, en couleur uniquement au clic/hover (pattern classique de hiérarchisation visuelle)

---

## 6. Hiérarchie visuelle & densité

- **Grilles produits denses** (6-8 colonnes desktop) mais chaque card garde une respiration interne (padding cohérent)
- **Sections séparées par un espacement vertical généreux** + titre de section systématique — jamais deux blocs de contenu qui se touchent sans transition claire
- Le carousel horizontal (catégories, produits, avis) est le pattern dominant pour gérer beaucoup de contenu sans allonger le scroll vertical inutilement

---

## 7. Patterns de confiance & conversion (spécifique e-commerce reconditionné)

Back Market doit lever un doute spécifique ("est-ce fiable, un produit reconditionné ?"). Le design répond par **répétition contrôlée** du même vocabulaire de confiance à plusieurs endroits :
- Bandeau réassurance (haut de page)
- États de produit standardisés et toujours affichés (jamais un produit sans mention d'état)
- Prix toujours contextualisé (jamais un prix nu)
- Avis systématiquement visibles sur chaque card
- FAQ qui répond aux objections concrètes (paiement, assurance, recyclage)

**Principe transférable** : identifier LE doute principal de ton utilisateur, puis répéter le message qui le lève à 3-4 endroits différents de la page avec des formats différents (badge, bandeau, FAQ, avis).

---

## 8. Mobile-first / responsive

Indices forts que le design part du mobile puis s'étend :
- Carousels horizontaux partout (pattern natif mobile, adapté ensuite au desktop)
- Vidéos en format vertical même affichées sur desktop
- Card produit conçue pour être lisible en colonne étroite avant d'être étalée en grille large

---

## 9. Accessibilité (points observés)

- Contrastes texte/fond élevés (noir sur blanc pour l'essentiel)
- Liens de recyclage/légal explicites en footer, y compris une page dédiée "Déclaration d'accessibilité"
- Structure de titres (H1/H2) cohérente section par section

---

## 10. Recommandations actionnables pour tes projets

**Pour Diamant Brut (landing/waitlist scouting sportif)** :
- Reprends le séquençage : proposition de valeur → réassurance/crédibilité (ex: "utilisé par X clubs", données vérifiées) → preuve sociale (témoignages scouts/joueurs) → FAQ → CTA final. C'est un modèle solide pour une page qui doit convaincre avant conversion.
- Le pattern "carousel horizontal + card dense" fonctionne bien pour afficher des profils de joueurs scoutés (photo, stats clés, badge "nouveau"/"tendance").

**Pour Solidaris / l'app mutuelle (SaaS gestion)** :
- Le bandeau de réassurance (icônes + texte court) est un bon pattern pour un dashboard d'onboarding : rappeler en un coup d'œil sécurité des données, conformité, support.
- La FAQ à la 1ère personne + liens internes en gras est un pattern simple à répliquer pour une base d'aide intégrée.

**Composant à copier directement** : la card produit dense (badge + image + specs condensées + prix + preuve sociale + CTA) est un pattern générique très solide dès que tu affiches une liste d'entités comparables (produits, profils, offres, dossiers).

---

## Sources

- Contenu de page : https://www.backmarket.fr/fr-fr (fetch du 17/08/2026)
- Identité de marque : Studio Herrström — https://www.studioherrstrom.com/work/back-market
- The Brand Identity — rebrand Back Market
- Creative Boom — identité visuelle Back Market
