# Lancement des abonnements payants — la liste, dans l'ordre

> 2026-11-09. Ce qui reste à BRANCHER pour faire payer pour de vrai : le code
> est sur `cc`. Chaque étape dit qui la fait. On ne passe à l'étape suivante
> que la précédente faite et vérifiée. L'ordre compte : la dernière étape
> (`ABONNEMENT_EXIGE=oui`) ferme la saisie de tous les comptes sans
> abonnement, elle ne se joue qu'une fois tout le reste prêt.
>
> Détail et raisons : `docs/adr/053-abonnements-stripe.md`,
> `docs/notes-chantier-abonnements-stripe.md` (§ 12 TVA et factures, § 13
> rappels), `docs/etat-bascule-clever-cloud.md` (section Abonnements).

## 0. Avant tout — hors Stripe

| | Quoi | Qui |
|---|---|---|
| 0.1 | L'application Clever Cloud existe et `cc` y tourne (préproduction, puis production) — étape 1 du document de bascule | propriétaire |
| 0.2 | Conditions générales de vente rédigées (durée, résiliation, impayé, sort des données après 12 mois, conservation du DUERP à la charge de l'employeur) et publiées à la place du texte actuel de `/conditions` ; `VERSION_CONDITIONS` montée d'un cran (`src/lib/abonnements/conditions.ts`) | avocat → Claude pour l'intégration |
| 0.3 | Régime de TVA confirmé (20 % retenu ; en franchise : retirer le taux et porter « TVA non applicable, art. 293 B du CGI ») et mentions de la facture validées | expert-comptable |

## 1. Compte Stripe en mode réel — propriétaire, tableau de bord

1. Activer le compte : identité, société (SIRET), compte bancaire de versement.
2. Double authentification sur son propre accès ; un compte nominatif par
   personne, au rôle minimal ; aucun accès partagé (le tableau de bord permet
   de changer le compte Rojer d'un client, d'offrir une formule, de
   rembourser).
3. **Informations publiques** : raison sociale, adresse, SIREN, numéro de TVA,
   e-mail d'assistance ; URL des conditions : `https://<domaine>/conditions`
   (Checkout refuse le paiement sans elle) ; libellé de relevé bancaire
   court, 10 caractères au plus (au-delà, Stripe remplace la fin par
   « * TRIAL OVER » après un essai) — par exemple `ROJER`.

## 2. Catalogue — propriétaire, tableau de bord (mode réel)

Les valeurs doivent être EXACTEMENT celles-ci : Rojer retrouve les prix par
leur clé et écarte un prix dont l'intervalle contredit la clé.

| Produit | Clé du prix (`lookup_key`) | Montant | Facturation |
|---|---|---|---|
| Essentiel | `rojer_essentiel_mensuel` | 29,00 € | tous les mois |
| Essentiel | `rojer_essentiel_annuel` | 295,00 € | tous les ans |
| Pro | `rojer_pro_mensuel` | 89,00 € | tous les mois |
| Pro | `rojer_pro_annuel` | 899,00 € | tous les ans |

- Prix récurrents, en EUR, **hors taxe** (« Inclure la taxe dans le prix » :
  non — `tax_behavior: exclusive`).
- La clé se saisit dans les options avancées du prix.
- **Taux de TVA** : Produits > Taux de taxe > nouveau : 20 %, type TVA, pays
  France, « exclusif » (en sus du prix). Sans lui, aucun essai ni abonnement
  ne démarre.
- « Sur mesure » : sur devis, sans prix dans Stripe — un client sur mesure se
  traite à la main le jour où il arrive (décision à prendre ce jour-là).

## 3. Factures, relances, e-mails — propriétaire, tableau de bord

- **Factures** (Billing > Factures) : numérotation au niveau du compte (une
  suite sans trou) ; pied de page avec les mentions entre professionnels :
  pénalités de retard (taux à fixer avec l'expert-comptable) et indemnité
  forfaitaire de 40 € pour frais de recouvrement.
- **Relances** (Billing > Récupération des revenus) : nouvelles tentatives
  intelligentes ; **si toutes les tentatives échouent : marquer l'abonnement
  comme impayé** (Rojer ferme alors la saisie, lecture et export restent).
- **E-mails clients** : envoyer les factures et reçus ; e-mails de carte
  expirée et d'échec de paiement ; **rappel 7 jours avant la fin d'un essai
  gratuit** (celui de la veille est envoyé par Rojer).

## 4. Portail client — propriétaire, tableau de bord

Billing > Portail client, configuration par défaut :
- historique des factures : oui ; mise à jour du moyen de paiement : oui ;
- résiliation : oui, **en fin de période**, sans prorata ;
- **changement de formule : non** (il se fait dans Rojer, qui contrôle les
  plafonds) ;
- le client peut modifier : nom, e-mail, adresse, numéro de TVA ;
- lien des conditions : celui de l'étape 1.3.

## 5. Webhook — propriétaire, tableau de bord

Développeurs > Webhooks > nouvelle destination :
- URL : `https://<domaine>/api/stripe/webhook` ;
- charge utile **légère** (« thin ») ;
- événements (`EVENEMENTS_ECOUTES`, `src/lib/stripe/webhook.ts`) :
  `v1.checkout.session.completed`, `v1.customer.subscription.created`,
  `.updated`, `.deleted`, `.paused`, `.resumed`, `.trial_will_end`,
  `v1.invoice.paid`, `v1.invoice.payment_failed`,
  `v1.invoice.payment_action_required` ;
- noter le secret de signature `whsec_…` (étape 7).

## 6. Clé restreinte — propriétaire, tableau de bord

Développeurs > Clés API > clé restreinte « Rojer production », permissions
(relevées sur les appels du code le 2026-11-09) :

| Ressource | Accès |
|---|---|
| Customers | écriture |
| Subscriptions, et Subscription schedules s'ils sont listés à part | écriture |
| Checkout Sessions | écriture |
| Customer portal | écriture |
| Invoices | lecture |
| Prices, Products | lecture |
| Tax Rates | lecture |
| SetupIntents | lecture |
| PaymentMethods | lecture |

Tout le reste : aucun. La clé ne se colle jamais dans une conversation.

## 7. Variables de l'application Clever Cloud (production) — propriétaire

| Variable | Valeur |
|---|---|
| `APP_ENV` | `production` (sans elle, aucune clé Stripe n'est acceptée) |
| `STRIPE_SECRET_KEY` | la clé restreinte `rk_live_…` de l'étape 6 |
| `STRIPE_WEBHOOK_SECRET` | le `whsec_…` de l'étape 5 |
| `TACHES_SECRET` | `openssl rand -base64 32` (tâche quotidienne, rappel de la veille — PR #257) |
| `ABONNEMENT_EXIGE` | **ne pas la poser encore** (étape 10) |

Redémarrer, puis lire les journaux du démarrage : aucun avertissement
« Stripe » ne doit apparaître, et la crontab doit s'être installée
(« Importing cronjobs »).

## 8. Vérifier en réel, avant d'ouvrir — propriétaire, avec Claude

1. Créer un compte de test sur la production, démarrer l'essai : il démarre
   (sinon : prix ou TVA introuvable, voir les journaux).
2. Choisir une formule avec sa propre carte, « tout de suite » : la facture
   arrive par e-mail, avec la TVA et les mentions ; la page Abonnement dit
   « actif » ; le tableau de bord montre l'événement livré au webhook (200).
3. Résilier depuis le portail, puis rembourser la facture dans le tableau de
   bord.
4. Le lendemain : la tâche quotidienne a répondu (journaux, réponse JSON).

## 9. Reprises — Claude ou propriétaire, sur la production

Chacune d'abord sans `--appliquer` (elle compte, n'écrit rien), puis avec :

```
pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-tailles-fichiers.ts
pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-debut-payant.ts
```

(la base lue est celle de `DATABASE_URL`, affichée en tête : vérifier que
c'est la production avant `--appliquer`).

## 10. Ouvrir — propriétaire

1. Poser `ABONNEMENT_EXIGE=oui`, redémarrer. Dès lors, un compte sans essai
   ni abonnement ne saisit plus (lecture et export restent).
2. Relancer `reprendre-tailles-fichiers.ts --appliquer` (un dépôt fait
   entre-temps sans session lisible n'a pas laissé sa taille).
3. Se connecter avec un compte existant : la page Abonnement propose l'essai
   ou la souscription ; la saisie se comporte comme prévu.

## Après le lancement (sans urgence)

- Suppression des données 12 mois après la fin de l'essai ou de
  l'abonnement, avec ses e-mails J-30 et J-7 (la tâche quotidienne les
  accueillera) : aucune ne peut arriver avant fin 2027.
- Facturation électronique (émission obligatoire en septembre 2027) : Stripe
  n'est pas plateforme agréée ; choisir comment les factures y passeront.
