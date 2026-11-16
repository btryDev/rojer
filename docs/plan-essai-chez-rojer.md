# Plan — l'essai se compte chez Rojer, Stripe n'entre qu'au paiement

Décision de la propriétaire du 2026-11-16 (ADR-053 § 9, amendé). Ce plan dit
ce qui est construit, ce qui est supprimé, et dans quel ordre. Une étape
faite se raye et se date (règle 11).

## Le parcours visé

| Moment | Ce que voit le dirigeant | Chez Rojer | Chez Stripe |
|---|---|---|---|
| Inscription | « Démarrer mon essai » (conditions acceptées) | `essaiUtiliseLe`, `finEssai` = + 30 j, preuve d'acceptation | rien |
| Pendant l'essai | Saisie ouverte, limites de l'essai ; « S'abonner », discret | droits lus sur `finEssai` | rien |
| J − 7, J − 1 | E-mail de rappel | envoyés par Rojer | rien |
| Fin de l'essai | « Votre essai est terminé — S'abonner » ; lecture et export gardés | saisie fermée par la date ; horloge des 12 mois depuis `finEssai` | rien |
| « S'abonner » | Page de Stripe : formule choisie, carte, 3-D Secure, conditions, adresse | client Stripe créé à ce moment | Checkout, mode abonnement, paiement immédiat |
| Abonné | Portail (carte, factures, résiliation) ; changement de formule dans Rojer | copie relue, comme aujourd'hui | abonnement |

## ~~Lot 0 — Avant de commencer~~ [fait le 2026-11-17 : #329 fusionnée (a219f37a) ; #330 en attente chez la session parallèle, points 4 et 5 à part]

1. Fusionner ce qui reste utile de la PR #329, réduit : `carteQuiAPaye`
   (la carte qui a payé devient celle du client), `rendrePlanningEchu`
   retenté, `ids.ts`, libellé « Paiement à régler ». En retirer ce qui
   meurt ici (`finaliserCarte`, `appliquerFormule`, vue « finalisation »).
2. PR #330 (session parallèle) : points 1 et 2 abandonnés (couverts par
   Checkout) ; points 4 et 5 dans leur propre PR, indépendante.
3. PR #327 (horloges de test) : fermée sans fusion, après la répétition.

## ~~Lot 1 — Données (une migration)~~ [codé le 2026-11-17, branche `lot/essai-chez-rojer-v2` : migration `20261117090000_essai_chez_rojer`, script `scripts/reprendre-essais-stripe.ts` ; statut vide pendant l'essai, plutôt que `trialing` écrit par Rojer]

- `Abonnement.stripeCustomerId` devient facultatif : la ligne naît à
  l'essai, sans client Stripe. L'unicité reste.
- `statut` pendant l'essai : `trialing`, écrit par Rojer ; `finEssai` fait
  foi. Aucun état nouveau : « essai terminé » = `trialing` et `finEssai`
  passée, calculé à la lecture (pas de tâche qui bascule un état).
- Les comptes de test existants (préprod) : leurs abonnements d'essai et en
  pause chez Stripe sont résiliés par un script lancé une fois, leur ligne
  garde `essaiUtiliseLe` et `finEssai`. Aucune production à reprendre.
- Gardes à relancer : `migrations-rls`, `tenancy-*`, `scope.integration`.

## ~~Lot 2 — L'essai chez Rojer~~ [codé le 2026-11-17 ; s'y ajoute `essai-entreprise.ts`, qui lisait `trialing` — la règle d'un essai par SIREN ne jouait plus]

- `essai.ts` : `demarrerEssaiDuCompte` n'appelle plus Stripe — écrit la
  ligne (dates, preuve d'acceptation) dans une transaction. Disparaissent le
  verrou de reprise, `reserverClient`, `abonnementChezStripe`,
  `relireEtContinuer`, `PRIX_D_ESSAI`.
- `droits.ts` : une seule lecture de l'état — essai en cours, essai terminé,
  abonné, à régler, résilié. `SANS_PAIEMENT_ENCORE`, `paused` et
  `situationFermee` « essai sans carte » sont repris ou supprimés.
- `quotas.ts` : les limites de l'essai restent celles d'un compte sans
  `debutPayantLe` ; le message d'une limite renvoie à « S'abonner ».
- `suppression.ts` : l'horloge des douze mois part de `finEssai` pour un
  compte qui ne s'est jamais abonné (aujourd'hui : relecture Stripe).
- `rappels.ts` : le rappel des 7 jours passe de Stripe à Rojer (même
  mécanique que celui de la veille, colonne de garde à ajouter au lot 1).
- `essai-entreprise.ts` (un essai par SIREN) : inchangé dans sa règle, relu
  pour ne plus supposer un abonnement Stripe.

## ~~Lot 3 — « S'abonner »~~ [codé le 2026-11-17 ; la carte seule sur Checkout est un réglage du tableau de bord, pas du code — `docs/lancement-abonnements.md` § 4]

- `sAbonnerAction` : une seule branche. Pas d'abonnement payant en cours →
  client Stripe créé s'il manque, puis `ouvrirCheckout` (mode abonnement).
  Un premier paiement resté en attente (`incomplete`) → sa facture, comme
  aujourd'hui. Déjà abonné → la page.
- `ouvrirCheckout` : `payment_method_types: ["card"]` (Klarna, Bancontact,
  Satispay retirés, à vérifier à l'écran), conditions, numéro de TVA,
  adresse — déjà en place.
- Page Abonnement : quatre états — essai (dates, lien « S'abonner »),
  essai terminé (appel à s'abonner), abonné (portail, changement de
  formule), à régler (facture). `vue-abonnement.ts` réduit d'autant.
- `FormulaireAbonnement` : formule et rythme, un bouton. Plus de mode
  « payer / changer / enregistrer ».
- L'offre choisie sur la page publique (cookie) présélectionne la formule.

## ~~Lot 4 — Suppression de l'ancien système~~ [fait le 2026-11-17 ; reste `scripts/reprendre-debut-payant.ts`, script de reprise daté qui nomme `paused` dans sa requête]

À retirer, avec leurs tests, puis une recherche de contrôle sur chaque nom :

| Fichier | Ce qui part |
|---|---|
| `stripe/parcours.ts` | `demarrerEssai`, `ouvrirCheckoutCarte`, `appliquerFormule`, `reglerLaFacture`, `factureAuPrixAffiche`, le réglage de pause dans `planifierBaisse` |
| `abonnements/souscription.ts` | le fichier (`finaliserCarte`, `carteParDefaut`) |
| `abonnements/actions.ts` | `finaliserCarteAction`, la branche essai/pause de `sAbonnerAction` |
| `components/abonnements/FinalisationCarte.tsx` | le fichier |
| `stripe/traitement.ts` | le cas `mode: "setup"` de `checkout.session.completed` |
| `stripe/webhook.ts` | `subscription.paused`, `.resumed`, `.trial_will_end` (et le script d'installation des événements, la doc de lancement) |
| `stripe/config.ts`, `env.ts`, `.env.example` | `STRIPE_HORLOGE_TEST` (jamais fusionné : rien à retirer de `main`) |
| `scripts/`, `lire-preprod.ts` | les lectures de `paused` ; `stripe-installer-test.ts` relu |

Contrôle : `grep` sur `paused`, `trial_end`, `trial_settings`, `setup`,
`immediat`, `rojerChoixLe`, `finaliserCarte`, `appliquerFormule` — plus
aucune occurrence hors des documents datés.

## ~~Lot 5 — Documents~~ [fait le 2026-11-17 ; conditions générales : texte provisoire, à reprendre avec le juriste]

- ADR-053 : §§ 8 à 10 rayés là où ils ne sont plus vrais, renvoi à
  l'amendement du § 9.
- `docs/lancement-abonnements.md` : événements écoutés, réglages Stripe
  (adresse des conditions générales OBLIGATOIRE pour Checkout — constaté le
  2026-11-16 ; e-mail de fin d'essai de Stripe devenu sans objet ; e-mail de
  confirmation bancaire aux renouvellements à activer), répétition réécrite.
- `docs/rgpd.md`, conditions générales (texte provisoire) : l'essai, sa fin.
- `CLAUDE.md` : la ligne ADR-053.

## Lot 6 — Preuve

- Tests écrits avec le code : droits par état et par date, démarrage de
  l'essai sans Stripe, « S'abonner » (trois issues), rappels, horloge de
  suppression, page et formulaire par état.
- Répétition locale, courte : essai → fin d'essai (date reculée en base) →
  « S'abonner » avec 4242, 3155 (3-D Secure), carte refusée → abonné →
  renouvellement, changement de carte, baisse, résiliation, réabonnement
  (horloge de simulation, sur le client créé par Checkout).
- Relecture indépendante (niveau élevé), simplification, sécurité ; CI
  verte ; fusion sur accord de la propriétaire ; préprod ensuite.

## Ce qui ne change pas

Le portail, la relecture de l'abonnement (file, bail, rapprochement
quotidien), le changement de formule (montée immédiate, baisse en fin de
période), les quotas par formule, les alertes, la suppression à douze mois.

## Ordre et taille

Lots 1 à 4 dans une seule PR (ils ne tiennent pas l'un sans l'autre),
précédée du lot 0. Environ une journée, répétition comprise.
