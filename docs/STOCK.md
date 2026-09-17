# Les quatre stocks — quand chacun bouge

| Stock | Signification |
|---|---|
| **Virtuel** | commandé au fournisseur, vendable dès maintenant |
| **Disponible** | physiquement possédé (bureau + entrepôt) — peut être négatif (vente anticipée) |
| **Bureau** | présent au bureau, retirable par les membres |
| **Entrepôt** | stocké à l'entrepôt |
| **Stock personnel** (UserStock) | produits qu'un membre a achetés et pas encore retirés |

Toute modification passe par `lib/stock.ts → move()` et écrit une ligne
`StockMovement`. Aucun autre code ne touche ces colonnes.

## 1. Commande fournisseur (`SupplyOrder`)

| Événement | Virtuel | Disponible | Bureau | Entrepôt |
|---|---|---|---|---|
| Création | **+q** | | | |
| Réception (répartition b + e = q) | | **+q** | **+b** | **+e** |
| Annulation | **−q** | | | |

## 2. Commande membre (`Order`)

| Événement | Virtuel | Disponible | Stock personnel |
|---|---|---|---|
| Envoi du reçu (PENDING) | | | |
| Validation (→ VALIDATED) | **−q** | **−q** | **+q** |
| Rejet (PENDING → REJECTED) | | | |
| Annulation / remboursement d'une validée | **+q** | **+q** | **−q** |

Une commande validée ne peut plus être rejetée : on l'annule ou on la rembourse.

## 3. Retrait (`Delivery`)

| Événement | Bureau | Stock personnel |
|---|---|---|
| Demande (PENDING) | | |
| Approbation (→ APPROVED) | | |
| Remise (→ DELIVERED) | **−q** | **−q** |
| Refus | | |

La remise est refusée si le membre ne possède pas la quantité, si le stock
bureau est insuffisant, ou si une TVA fixée n'est pas payée.

## 4. Conversion (`ProductConversion`)

Le membre rend A (qa), reçoit B (qb).

| | Virtuel | Disponible | Bureau | Stock personnel |
|---|---|---|---|---|
| Produit A rendu | +qa | +qa | +qa | −qa |
| Produit B donné | −qb | −qb | −qb | +qb |

## 5. Transfert

Déplace q d'un emplacement vers un autre (ex. Entrepôt → Bureau) :
source −q, destination +q.

## 6. Ajustement manuel

±q sur l'emplacement choisi avec un motif (correction d'inventaire,
réception, retour, perte). Un stock ne peut pas devenir négatif, sauf
Disponible (ventes anticipées) et Virtuel (annulation fournisseur).
