# Cahier technique Claude Code — Application de facturation Firebase

## Objectif

Créer une application web de facturation pour Bis Repetita, utilisable facilement sur smartphone, installable comme PWA, sécurisée, gratuite au départ, avec consultation hors ligne et synchronisation quand internet revient.

L'application doit permettre de gérer :

- Clients
- Services
- Création de factures
- QR-facture suisse officielle
- PDF automatique
- Envoi par email
- Paiements et relances
- Paramètres de facturation
- Export CSV/Excel

---

# Stack technique imposée

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Mobile-first
- PWA installable sur smartphone


## Direction artistique et niveau de design exigé

Le design ne doit pas ressembler à une interface SaaS générique, ni à un simple assemblage de composants shadcn/ui par défaut.

Objectif : créer une application de facturation premium, sobre, rapide et élégante, cohérente avec l'image Bis Repetita : studio de boxe contemporain, précis, haut de gamme mais accessible.

### Principes visuels

- Interface mobile-first particulièrement soignée.
- Design minimal, dense mais respirant.
- Ambiance premium, sombre/neutre, inspirée d'un studio contemporain.
- Priorité à la lisibilité, aux contrastes et à la hiérarchie visuelle.
- Éviter les couleurs criardes, les cartes trop arrondies génériques et les interfaces trop "template".
- Utiliser des micro-interactions discrètes : hover, press state, transitions de statut, feedback de sauvegarde.
- Chaque écran doit avoir une intention claire : pas d'empilement de tableaux basiques.

### Style recommandé

- Fond principal : blanc cassé ou gris très clair en mode clair, noir profond ou anthracite en mode sombre.
- Accent : noir, graphite, beige chaud ou couleur de marque Bis Repetita si disponible.
- Typographie : moderne, lisible, avec une hiérarchie forte.
- Titres courts et impactants.
- Cartes sobres avec bordures fines, ombres très légères, ou séparation par lignes.
- Utiliser des badges de statut très lisibles : brouillon, envoyée, en retard, payée, annulée.
- Les montants doivent être visuellement mis en avant.

### UX mobile obligatoire

L'application doit être excellente sur smartphone.

Exigences :

- Barre de navigation basse sur mobile.
- Bouton principal flottant ou très accessible pour créer une facture.
- Création de facture en wizard fluide.
- Grandes zones tactiles.
- Actions rapides : dupliquer, envoyer, marquer payé.
- Filtres simples sous forme de chips.
- Recherche toujours facile à trouver.
- Aucun tableau large inutilisable sur mobile.
- Sur mobile, remplacer les tableaux par des cartes de factures bien structurées.
- Sur desktop, les tableaux peuvent être utilisés, mais ils doivent rester élégants et lisibles.

### Écrans à concevoir avec soin

#### Dashboard

Doit donner une vue claire et premium :

- CA facturé du mois
- Montant en attente
- Factures en retard
- Dernières factures
- Actions rapides

Ne pas faire un dashboard trop chargé.

#### Liste des factures

Sur mobile : cartes compactes avec :

- Numéro facture
- Client
- Montant
- Date d'échéance
- Statut
- Action rapide

Sur desktop : tableau propre avec filtres avancés.

#### Création de facture

L'écran le plus important.

Il doit être fluide, rassurant et très clair :

1. Client
2. Prestations
3. Paiement / TVA
4. Aperçu

À chaque étape, afficher un résumé discret du total et du client sélectionné.

#### Aperçu facture

L'aperçu doit ressembler au PDF final.

Il doit donner confiance avant validation.

#### Paramètres

Diviser en sections claires : société, banque, TVA, emails, numérotation.

### Composants UI à créer

Créer des composants personnalisés plutôt que d'utiliser uniquement les composants shadcn par défaut :

- `InvoiceCard`
- `InvoiceStatusBadge`
- `MoneyAmount`
- `ClientSearchCommand`
- `MobileBottomNav`
- `QuickActionButton`
- `InvoiceWizardProgress`
- `InvoicePreview`
- `EmptyStatePremium`
- `PageHeader`
- `FilterChips`
- `MetricCard`

### Règle importante pour Claude Code

Avant de développer les écrans principaux, Claude Code doit proposer une mini direction artistique avec :

- palette de couleurs
- typographies
- principes d'espacement
- style des boutons
- style des cartes
- style des badges
- exemple de layout mobile pour la liste des factures
- exemple de layout mobile pour la création de facture

Il ne doit pas commencer à coder l'interface complète avant validation de cette direction artistique.

### Critères d'acceptation design

Une fonctionnalité n'est pas considérée terminée si elle fonctionne techniquement mais que l'interface est basique.

Chaque écran doit être validé selon ces critères :

- utilisable facilement sur smartphone
- visuellement cohérent avec les autres écrans
- actions principales évidentes
- statut et montant lisibles en moins de 2 secondes
- pas de tableau horizontal ingérable sur mobile
- pas de design shadcn brut sans personnalisation
- états vides élégants
- messages d'erreur clairs
- feedback après chaque action importante

## Backend / base de données

- Firebase
- Firebase Auth
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions si nécessaire

## Hors ligne

- Firestore offline persistence
- IndexedDB / cache PWA pour consultation hors ligne
- Création de brouillons possible hors ligne
- Validation officielle uniquement en ligne

## Emails

Prévoir une intégration email via :

- Gmail API ou
- Resend ou
- Firebase Cloud Functions + provider email

L'envoi email peut être développé après le MVP.

---

# Règle importante

Une facture officielle validée ne peut jamais être supprimée.

Elle peut uniquement être :

- envoyée
- marquée payée
- marquée partiellement payée
- annulée
- relancée
- dupliquée en nouvelle facture brouillon

Seules les factures en brouillon peuvent être supprimées.

---

# Fonctionnement hors ligne

## Autorisé hors ligne

- Consulter les clients déjà chargés
- Consulter les services déjà chargés
- Consulter les factures déjà chargées
- Créer une facture brouillon
- Modifier une facture brouillon
- Préparer des lignes de facture

## Interdit hors ligne

- Valider une facture officielle
- Générer un numéro officiel
- Générer une QR-facture définitive
- Envoyer une facture par email
- Marquer comme payée si la donnée ne peut pas être synchronisée immédiatement

Message à afficher si l'utilisateur tente une action interdite hors ligne :

> Cette action nécessite une connexion internet afin de garantir la numérotation officielle et la sécurité des données.

---

# Structure de navigation

Créer les onglets/pages suivants :

1. Dashboard
2. Clients
3. Services
4. Factures
5. Créer une facture
6. Paiements / Relances
7. Paramètres

Navigation mobile :

- Barre basse sur smartphone
- Menu latéral sur desktop
- Gros boutons d'action
- Recherche visible rapidement

---

# Authentification

Utiliser Firebase Auth.

Méthodes :

- Email + mot de passe
- Google login optionnel

Pour la première version, un seul administrateur suffit.

Prévoir dans Firestore une collection `users` avec :

```ts
users/{uid}
{
  email: string,
  displayName: string,
  role: "admin" | "viewer",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

Règle : seul un utilisateur connecté avec le rôle `admin` peut créer, modifier, valider ou envoyer une facture.

---

# Modèle de données Firestore

## Collection `clients`

```ts
clients/{clientId}
{
  type: "person" | "company",
  firstName: string | null,
  lastName: string | null,
  companyName: string | null,
  displayName: string,
  email: string,
  addressLine1: string,
  addressLine2: string | null,
  postalCode: string,
  city: string,
  country: string,
  clientCode: string,
  nextInvoiceNumber: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: timestamp | null
}
```

## Règles client

- `clientCode` doit être unique.
- Générer automatiquement un code depuis le nom ou la société.
- Exemple :
  - Nicolas Dupont → `DUP01`
  - Dupont SA → `DUP02`
- La première facture validée d'un client commence à `201`.
- `nextInvoiceNumber` vaut donc `201` à la création du client.

---

## Collection `services`

```ts
services/{serviceId}
{
  name: string,
  description: string,
  defaultPrice: number,
  unit: "heure" | "seance" | "forfait",
  vatApplicable: boolean,
  defaultVatRate: 0 | 2.6 | 8.1 | null,
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: timestamp | null
}
```

## Règles service

- Le prix du service sert de valeur par défaut.
- Le prix doit rester modifiable dans une facture sans modifier le service original.
- Un service peut être archivé mais pas supprimé s'il est déjà utilisé dans une facture.

---

## Collection `invoices`

```ts
invoices/{invoiceId}
{
  status: "draft" | "validated" | "sent" | "pending" | "overdue" | "partially_paid" | "paid" | "cancelled",

  clientId: string,
  clientSnapshot: {
    displayName: string,
    email: string,
    addressLine1: string,
    addressLine2: string | null,
    postalCode: string,
    city: string,
    country: string,
    clientCode: string
  },

  invoiceNumber: string | null,
  invoiceSequenceNumber: number | null,

  invoiceDate: timestamp,
  paymentDelayDays: number,
  dueDate: timestamp,

  currency: "CHF" | "EUR",

  lines: InvoiceLine[],

  discountType: "none" | "amount" | "percent",
  discountValue: number,

  subtotalExclVat: number,
  totalVat: number,
  totalInclVat: number,

  amountPaid: number,
  paymentDate: timestamp | null,

  paymentTermsText: string,
  additionalInfo: string | null,

  qrBillData: object | null,
  pdfStoragePath: string | null,
  pdfDownloadUrl: string | null,

  emailSentAt: timestamp | null,
  reminderSentAt: timestamp | null,

  createdAt: timestamp,
  updatedAt: timestamp,
  validatedAt: timestamp | null,
  cancelledAt: timestamp | null,

  createdBy: string,
  updatedBy: string
}
```

## Type `InvoiceLine`

```ts
type InvoiceLine = {
  id: string,
  serviceId: string | null,
  description: string,
  quantity: number,
  unit: "heure" | "seance" | "forfait",
  unitPrice: number,
  discountType: "none" | "amount" | "percent",
  discountValue: number,
  vatApplicable: boolean,
  vatRate: 0 | 2.6 | 8.1 | null,
  lineTotalExclVat: number,
  lineVatAmount: number,
  lineTotalInclVat: number,
  serviceDate: timestamp | null
}
```

---

# Numérotation des factures

## Règle

- Une facture en brouillon n'a pas de numéro officiel.
- Le numéro est généré uniquement lors de la validation.
- Première facture d'un client : `CODE-201`
- Ensuite : `CODE-202`, `CODE-203`, etc.

## Exemple

Client : Jean Martin

Code client : `MAR01`

Factures :

- `MAR01-201`
- `MAR01-202`
- `MAR01-203`

## Implémentation

Lors de la validation :

1. Vérifier que l'utilisateur est en ligne.
2. Lancer une transaction Firestore.
3. Lire le client.
4. Récupérer `nextInvoiceNumber`.
5. Générer `invoiceNumber`.
6. Écrire le numéro dans la facture.
7. Incrémenter `nextInvoiceNumber` du client.
8. Générer QR-facture et PDF.
9. Stocker le PDF dans Firebase Storage.
10. Mettre le statut à `validated`.

Important : cette opération doit être atomique.

---

# Création de facture

## Étapes UI

Créer un wizard mobile en 4 étapes :

1. Client
2. Prestations
3. Paiement / TVA / rabais
4. Aperçu et validation

## Étape 1 — Client

- Recherche client existant
- Bouton `+ Nouveau client`
- Création rapide sans quitter le flux

## Étape 2 — Prestations

Possibilité d'ajouter :

- Service existant
- Ligne libre
- Quantité
- Prix unitaire
- TVA
- Rabais par ligne

## Option multiple avec calendrier

Sur une ligne de service, ajouter un bouton `Multiple`.

Flux :

1. L'utilisateur choisit un service.
2. Il clique sur `Multiple`.
3. Un calendrier s'ouvre.
4. Il sélectionne plusieurs dates.
5. À la validation, l'application ajoute une ligne par date.

Exemple :

Service : `Cours de boxe`

Dates sélectionnées :

- 02.09.2026
- 06.09.2026

Lignes créées :

- `Cours de boxe du 02.09.2026`
- `Cours de boxe du 06.09.2026`

Chaque ligne garde :

- le prix du service
- l'unité
- la TVA
- la date de service

## Étape 3 — Paiement / TVA / rabais

Champs :

- Date de facture, par défaut aujourd'hui
- Délai de paiement, par défaut depuis les paramètres
- Date d'échéance calculée automatiquement
- Devise CHF/EUR
- Rabais global
- Texte conditions, par défaut : `Payable dans les 10 jours`
- Information supplémentaire libre

## Étape 4 — Aperçu

Afficher la facture comme le client la verra.

Boutons :

- Enregistrer brouillon
- Valider la facture
- Annuler

---

# QR-facture suisse

## Données à prévoir dans les paramètres

```ts
settings/billing
{
  companyName: string,
  addressLine1: string,
  postalCode: string,
  city: string,
  country: "CH",
  email: string,
  phone: string | null,
  iban: string,
  qrIban: string | null,
  useQrIban: boolean,
  defaultCurrency: "CHF" | "EUR",
  defaultPaymentDelayDays: number,
  defaultPaymentTermsText: string,
  vatEnabled: boolean,
  defaultVatRate: 0 | 2.6 | 8.1 | null,
  invoiceLanguage: "fr" | "en"
}
```

## Exigences QR

La facture PDF doit contenir :

- Nom complet de la société
- Adresse structurée
- IBAN ou QR-IBAN
- Référence QR ou communication libre
- Devise CHF/EUR
- Montant
- QR officiel
- Section paiement
- Récépissé

## Important

Utiliser une librairie fiable pour générer une QR-facture suisse conforme.

Si aucune librairie n'est intégrée au MVP, créer d'abord une interface abstraite :

```ts
interface SwissQrBillGenerator {
  generate(invoice: Invoice, settings: BillingSettings): Promise<QrBillResult>
}
```

Cela permettra de remplacer facilement l'implémentation plus tard.

---

# Génération PDF

Le PDF doit être généré lors de la validation officielle.

Contenu :

- Logo
- Informations société
- Informations client
- Numéro de facture
- Date facture
- Date d'échéance
- Tableau des prestations
- Rabais
- TVA
- Total
- Conditions de paiement
- QR-facture suisse

Stockage :

- Firebase Storage
- Chemin privé : `invoices/{invoiceId}/invoice.pdf`

Le lien de téléchargement ne doit pas être public permanent.

---

# Liste des factures

Afficher :

- Numéro
- Client
- Date
- Échéance
- Montant
- Montant payé
- Statut

Recherche :

- Client
- Numéro
- Statut

Filtres :

- Mois
- Année
- Payée
- En retard
- Brouillon

Actions individuelles :

- Voir
- Modifier si brouillon
- Télécharger PDF
- Envoyer par email
- Relancer
- Marquer comme payé
- Ajouter paiement partiel
- Annuler
- Dupliquer
- Supprimer si brouillon uniquement

Actions groupées :

- Télécharger PDF
- Envoyer par email
- Relancer
- Export CSV
- Export Excel

---

# Paiements et relances

## Paiement

Champs :

- Montant payé
- Date de paiement

Boutons :

- Marquer comme payé
- Ajouter paiement partiel

Règles :

- Si `amountPaid = 0`, statut reste en attente ou en retard.
- Si `amountPaid > 0` et inférieur au total, statut = `partially_paid`.
- Si `amountPaid >= totalInclVat`, statut = `paid`.

## Retard

Une facture est en retard si :

- statut non payé
- date d'échéance dépassée
- facture non annulée
- facture non brouillon

Créer une fonction qui recalcule le statut affiché selon la date.

## Relance

Relance manuelle uniquement.

Actions :

- Relancer une facture
- Relancer plusieurs factures sélectionnées

---

# Emails

## Paramètres email

```ts
settings/email
{
  invoiceEmailSubject: string,
  invoiceEmailBody: string,
  reminderEmailSubject: string,
  reminderEmailBody: string,
  sendCopyToSelf: boolean,
  copyEmail: string | null
}
```

## Variables disponibles

- `{prenom}`
- `{nom}`
- `{client}`
- `{numero_facture}`
- `{montant}`
- `{date_echeance}`
- `{lien_pdf}`

## Exemple objet facture

```txt
Facture {numero_facture} — Bis Repetita
```

## Exemple email facture

```txt
Bonjour {prenom},

Vous trouverez ci-joint votre facture {numero_facture} d'un montant de {montant}.

Elle est payable jusqu'au {date_echeance}.

Merci beaucoup,
Bis Repetita
```

## Exemple relance

```txt
Bonjour {prenom},

Sauf erreur de notre part, la facture {numero_facture} d'un montant de {montant} est arrivée à échéance le {date_echeance}.

Merci de procéder au paiement dès que possible.

Bis Repetita
```

---

# Paramètres

Créer une page Paramètres avec sections :

## Société

- Nom société
- Adresse
- NPA
- Ville
- Pays
- Email
- Téléphone
- Logo

## Coordonnées bancaires

- IBAN
- QR-IBAN
- Utiliser QR-IBAN oui/non

## Facturation

- Devise par défaut
- Délai de paiement par défaut
- Conditions par défaut
- TVA activée oui/non
- Taux TVA par défaut
- Langue facture

## Emails

- Modèle email facture
- Modèle email relance
- Objet facture
- Objet relance
- Copie à soi-même oui/non
- Email de copie

---

# Sécurité Firebase

## Règles générales

- Tout accès nécessite une authentification.
- Seuls les admins peuvent écrire.
- Les viewers peuvent lire uniquement si nécessaire.
- Les PDF ne sont pas publics.
- Les factures validées ne peuvent pas être supprimées.
- Les brouillons peuvent être supprimés.

## Règles Firestore à implémenter

Pseudo-règles :

```js
allow read: if request.auth != null;
allow create: if isAdmin();
allow update: if isAdmin();
allow delete: if isAdmin() && resource.data.status == "draft";
```

Ajouter des validations :

- Un utilisateur non connecté ne lit rien.
- Impossible de supprimer une facture non brouillon.
- Impossible de modifier `invoiceNumber` après validation.
- Impossible de modifier `validatedAt` après validation.

---

# Historique des modifications

Créer une sous-collection :

```ts
invoices/{invoiceId}/history/{historyId}
{
  action: string,
  previousStatus: string | null,
  newStatus: string | null,
  changedBy: string,
  changedAt: timestamp,
  details: object | null
}
```

Actions à logger :

- Création brouillon
- Modification brouillon
- Validation
- Envoi email
- Relance
- Paiement partiel
- Marqué payé
- Annulation
- Duplication

---

# Exports

## CSV

Exporter :

- Numéro facture
- Client
- Date facture
- Date échéance
- Statut
- Total HT
- TVA
- Total TTC
- Montant payé
- Date paiement

## Excel

Même contenu que CSV.

L'export Excel peut être développé après le MVP.

---

# PWA

Configurer :

- Manifest
- Icône app
- Nom : `Bis Repetita Facturation`
- Couleur thème sombre/neutre
- Service worker
- Cache des pages principales
- Fonctionnement mobile installable

Pages consultables hors ligne :

- Dashboard avec dernières données chargées
- Clients
- Services
- Factures déjà chargées
- Brouillons

---

# Ordre de développement recommandé

## Étape 0 — Direction artistique et système UI

Avant de coder les fonctionnalités métier, créer une base design solide.

À produire :

- palette de couleurs
- choix typographiques
- design tokens Tailwind
- composants UI de base personnalisés
- layout mobile
- layout desktop
- états vides
- badges de statut
- cartes de factures mobile
- boutons principaux et secondaires

Critère de validation :

- L'application ne ressemble pas à un template basique.
- Les composants shadcn/ui sont personnalisés.
- La liste des factures et le wizard de création ont une vraie direction visuelle.

## Étape 1 — Initialisation projet

- Créer projet Next.js TypeScript
- Installer Tailwind
- Installer shadcn/ui
- Configurer Firebase
- Configurer variables d'environnement
- Créer structure de dossiers propre

Dossiers recommandés :

```txt
/src
  /app
  /components
  /features
    /clients
    /services
    /invoices
    /settings
    /payments
  /lib
    firebase.ts
    calculations.ts
    invoice-numbering.ts
    qr-bill.ts
    pdf.ts
    email.ts
  /types
  /hooks
```

---

## Étape 2 — Authentification

- Page login
- Firebase Auth email/password
- Protection des routes
- Création du profil utilisateur dans Firestore
- Gestion rôle admin

Critère de validation :

- Un utilisateur non connecté ne peut accéder à aucune page.

---

## Étape 3 — Paramètres

- Créer page Paramètres
- Sauvegarder infos société
- Sauvegarder infos bancaires
- Sauvegarder paramètres TVA
- Sauvegarder modèles email
- Upload logo dans Storage

Critère de validation :

- Les paramètres sont récupérés automatiquement dans la création de facture.

---

## Étape 4 — Clients

- Liste clients
- Recherche
- Création client
- Modification client
- Archivage client
- Génération automatique code client unique

Critère de validation :

- Deux clients ne peuvent jamais avoir le même code client.

---

## Étape 5 — Services

- Liste services
- Création service
- Modification service
- Archivage service
- TVA applicable ou non
- Unité heure/séance/forfait

Critère de validation :

- Un service archivé n'apparaît plus dans la création de facture mais reste visible dans les anciennes factures.

---

## Étape 6 — Création facture brouillon

- Wizard mobile en 4 étapes
- Sélection client
- Création rapide client
- Ajout services
- Ajout lignes libres
- Rabais ligne/global
- TVA
- Calculs automatiques
- Sauvegarde brouillon

Critère de validation :

- Une facture brouillon peut être créée sans numéro officiel.

---

## Étape 7 — Mode multiple calendrier

- Ajouter bouton `Multiple`
- Ouvrir calendrier multi-date
- Générer une ligne par date
- Ajouter date au libellé

Critère de validation :

- Sélectionner 3 dates génère 3 lignes de facture correctes.

---

## Étape 8 — Validation facture et numérotation

- Bloquer validation hors ligne
- Transaction Firestore
- Générer numéro officiel
- Incrémenter `nextInvoiceNumber`
- Passer statut à `validated`
- Écrire historique

Critère de validation :

- Deux factures validées en même temps pour le même client ne peuvent pas recevoir le même numéro.

---

## Étape 9 — PDF et QR-facture

- Générer PDF
- Intégrer QR-facture suisse
- Stocker PDF dans Firebase Storage
- Associer chemin PDF à la facture

Critère de validation :

- Une facture validée génère automatiquement un PDF téléchargeable.

---

## Étape 10 — Liste factures

- Liste complète
- Recherche
- Filtres
- Actions individuelles
- Actions groupées
- Aperçu facture

Critère de validation :

- On peut retrouver rapidement une facture par client, numéro ou statut.

---

## Étape 11 — Paiements

- Marquer comme payé
- Ajouter paiement partiel
- Date de paiement
- Recalcul statut
- Historique

Critère de validation :

- Paiement partiel met bien le statut `partially_paid`.
- Paiement complet met bien le statut `paid`.

---

## Étape 12 — Relances et emails

- Templates email
- Variables dynamiques
- Envoi facture
- Envoi relance
- Copie à soi-même
- Envoi groupé
- Relance groupée

Critère de validation :

- Le PDF est joint ou accessible via lien sécurisé.

---

## Étape 13 — Exports

- Export CSV
- Export Excel
- Téléchargement groupé PDF

Critère de validation :

- L'export contient toutes les données comptables importantes.

---

## Étape 14 — PWA et hors ligne

- Manifest
- Service worker
- Cache
- Firestore offline persistence
- Messages hors ligne
- Test sur smartphone

Critère de validation :

- L'app peut être installée sur smartphone.
- Les factures déjà chargées restent visibles hors ligne.
- Les brouillons restent modifiables hors ligne.
- La validation est bloquée hors ligne.

---

# Priorité MVP

## MVP obligatoire

1. Authentification
2. Paramètres société
3. Clients
4. Services
5. Création facture brouillon
6. Validation avec numérotation
7. PDF facture
8. Liste factures
9. Paiement manuel
10. Interdiction de supprimer facture validée

## Après MVP

1. QR-facture suisse complète
2. Envoi email
3. Relance groupée
4. Export Excel
5. Téléchargement groupé PDF
6. PWA avancée hors ligne

---

# Contraintes de qualité

- Design premium obligatoire, pas d'interface générique
- Validation visuelle avant de considérer une étape terminée
- TypeScript strict
- Pas de logique métier directement dans les composants UI
- Calculs dans `/lib/calculations.ts`
- Numérotation dans `/lib/invoice-numbering.ts`
- QR dans `/lib/qr-bill.ts`
- PDF dans `/lib/pdf.ts`
- Email dans `/lib/email.ts`
- Composants réutilisables
- Interface mobile-first
- Messages d'erreur clairs
- Pas de suppression destructrice sauf brouillon

---

# Tests à prévoir

## Tests métier

- Calcul TVA
- Calcul rabais
- Calcul total
- Numérotation facture
- Statut paiement
- Statut retard
- Génération lignes multiples

## Tests sécurité

- Utilisateur non connecté bloqué
- Suppression facture validée impossible
- Modification numéro facture impossible après validation
- PDF non public

## Tests UX

- Création facture sur smartphone
- Recherche client rapide
- Duplication facture
- Marquer payé en un clic
- Consultation hors ligne

---

# Résultat attendu

Une application de facturation simple, fiable et mobile-first pour Bis Repetita, permettant de créer rapidement des factures, les envoyer, suivre les paiements et garder une base propre, sécurisée et consultable hors ligne.
