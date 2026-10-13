# Audit par module — 2026-10-12

Six auditeurs indépendants, en lecture seule, sur `origin/main` `4f6de986` (PR #20
comprise). Trois dossiers types communs (restaurant N5 8 salariés, commerce M5 4
salariés, bureau non-ERP 12 salariés) et le bord de la cible. Point de départ :
l'audit de bout en bout du 2026-09-27. Rapports détaillés : transcripts de la
session ; ce document en garde la synthèse, les décisions et le suivi.

**Constat d'ensemble.** Le cœur réglementaire tient : aucun manque au regard du
référentiel, aucune obligation sans surface, chaque condition du moteur a sa
question, aucun « conforme » prononcé par Rojer, isolation des routes publiques
saine. Ce qui manque est surtout **la capacité à corriger une saisie** (cinq
modules) et **la cohérence entre écrans** (un même fait dit différemment).

Hors champ (traité ailleurs) : envoi d'e-mails, hébergement, mentions légales,
sauvegardes. Déjà en cours le même jour : réactivation d'un appareil, seuil des
400 h, « non » imprimés au DUERP, étape transverses calculée, règle « À
renseigner » (ADR-044, dossier neuf / appareil ancien / salarié ancien), visites
avant affectation (fait, `7ab800e3`).

## 1. Bloquants V0

| # | Module | Constat | Remède |
|---|---|---|---|
| B1 | Onboarding | Définition de l'IGH fausse et inversée selon l'écran (`EtablissementForm.tsx:560`, `StepTypologie.tsx:341`) ; R. 146-3 : dernier plancher > 50 m habitation, > 28 m le reste. Refus à tort, ou refus évité. | Code (texte) |
| B2 | Fiche établissement | Un « non » aux EPI ne se corrige jamais (question seulement dans la checklist, `OnboardingChecklist.tsx:181`) ; un EPI déclaré ensuite ne rétablit rien. | Code |
| B3 | Contrôle | L'écran dit le DUERP « À jour » dès qu'une version existe, même mise à jour annuelle échue (`controle/page.tsx:116`) ; le README du ZIP dit l'inverse. | Code |
| B4 | Prestataires | Fiche non modifiable après création : ni nouvelle attestation, ni RC Pro, ni Kbis, ni contacts ; pastille et phrase se contredisent. | Code |
| B5 | Plans de prévention | Plan non modifiable : inspection commune impossible à enregistrer après coup (alerte jusqu'à clôture) ; R. 4512-7 impossible. | Code |
| B6 | Carnet sanitaire | Aucune correction d'un relevé, d'une analyse ou d'un point ; les erreurs partent au ZIP. | Code |
| B7 | Accessibilité | QR, affiche et ZIP replient sur `localhost:3000` si `PUBLIC_APP_URL` manque (`email/index.ts:110`). | Variable Vercel + code (refus du repli en prod) |

## 2. Importants

**Corriger une saisie** — action du plan non modifiable ni rouvrable (`modifierActionPlan`, `rouvrirAction` sans écran) ; permis de feu non modifiable ; rapport de vérification seulement supprimable, définitivement ; champ d'accessibilité rempli qu'on ne peut plus vider ; décocher un risque au DUERP efface risque, cotation et actions levées sans confirmation.

**Écrans qui se contredisent** — manque en retard (ADR-043 (d)) en tête des cartes mais absent du bandeau, du relevé « dépassées », du compteur calendrier et de l'indice ; en-têtes de mois du calendrier qui comptent l'« à confirmer » comme retard (D26) ; permis « co-signé et valide » sous une pastille « en attente » ; signature attribuée à une partie par adresse e-mail ; registre d'accessibilité 100 % sur 4 conditions quand l'arrêté liste 9 pièces ; ERP repassé non-ERP resté publié ; deux phrases IGH contradictoires sur « ne couvre pas » ; registre PDF sans avertissement de calendrier périmé ; fiches « Exercices » ERP marquées « à confirmer » à tort ; fiche appareil qui ne compte pas les états permanents ; « Quand ça arrive » sans marque « à confirmer ».

**Dire faux ou trop** — documents obligatoires : échéance 12 mois annoncée pour respiratoire et gilet (faux depuis ADR-042), page « y compris ailleurs » à 9 documents quand le référentiel en attend 8 à 12 ; aide « habitation » qui promet ramonage, VMC-Gaz, paratonnerres ; « Préparer un contrôle » qui promet tout ce qu'un inspecteur peut demander ; carnet « fichier sanitaire » sur-annoncé ; score « satisfaisante » sans aucun DUERP.

**DUERP** — PDF d'une version refabriqué à chaque fois, avec les versions postérieures dans son historique ; import CSV UTF-8 sans BOM refusé ; import qui range des mesures prévues parmi les mesures en place ; mesures « déjà en place » comptées comme actions levées sans justificatif ; rapport « écart majeur » sans action signalé nulle part.

**Moteur et calendrier** — décocher « travail » avec des salariés accepté (62 → 17 obligations sans un mot) ; prescription qui renforce une obligation d'établissement acceptée puis ignorée.

**Tiers** — OTP : limite des 3 essais contournable en parallèle, double signature possible ; le dirigeant ne signe pas depuis son compte ; contre-signature du plan de prévention (§ 10) non faite ; Kbis sans échéance alors que D. 8222-5 « tous les six mois » semble le viser ; RC Pro rangée sous la vigilance.

**Périmètre annoncé** — refus à l'onboarding sans lien vers ce qui est exclu ; hôtel, U, X en 5ᵉ non prévenus des chapitres PO/PU/PX ; dossier PDF, ZIP et MCP sans niveau audit ni articles annoncés ; MCP 7 obligations sur 46 pour le bureau (D4).

## 3. Peut attendre
Slug d'accessibilité en double ; SIRET en double ; portées « dépôt »/« consultation » jamais émises ; statut du permis non contrôlé côté serveur ; ~~« À jour » carnet à 7 jours (texte : mensuel)~~ [2026-10-13 : clos, `lot/controle-visuel-1310` — mensuel, prédicat `releveAncien`] ; dates futures acceptées ; plan d'actions PDF « aucune action » avec 3 levées ; titre « registre incendie » pour tous ; filtres du registre à 3 domaines ; organisme facultatif ; 4ᵉ refus implicite (0 salarié) ; somme des effectifs des sites ; code mort `deduction-erp.ts` ; motif « première version » ; titre redéclaré écrasé sans historique ; export RGPD sans calendrier ni actions liées ; conservation des sortis sans durée ; notes « locaux à sommeil » périmées sur deux obligations électriques (rebranchement).

## 4. Décisions qui reviennent à la propriétaire
1. Kbis semestriel (après Légifrance) ; RC Pro sous la vigilance ou à part.
2. Contre-signature (§ 10) : horodatage tiers ; ce que voit le porteur du lien avant le code ; portées dépôt/consultation : faire ou retirer.
3. Accessibilité : déposer les pièces de l'art. 1er ou annoncer qu'elles restent hors Rojer ; attestation annuelle de formation (1ʳᵉ–4ᵉ cat.).
4. Carnet : une analyse ≥ 1000 UFC/L crée-t-elle une action ? ~~seuil 7 jours ou mensuel~~ [2026-10-13 : mensuel, tranché par la propriétaire].
5. DUERP : figer (stocker) le PDF d'une version ; l'absence de DUERP compte-t-elle au score ; une mesure « en place » est-elle une action levée ; forme du signal « écart majeur sans action ».
6. Tableau de bord : aligner bandeau, rail et indice sur ADR-043 (d).
7. Contrôle : sens de « À jour » ; documents obligatoires dérivés du référentiel ou titre reformulé ; niveau audit et articles annoncés dans PDF/ZIP/MCP ; D4 ; D5.
8. Rapports : suppression logique et correction plutôt que destruction.
9. Onboarding : lien après refus ; annonce PO/PU/PX par type d'ERP ; 4ᵉ refus ; somme des effectifs ; décocher « travail ».
10. Prescriptions visant l'établissement : dire ou porter.
11. Réactivation d'un appareil (plan rendu) ; seuil des 400 h, nouvel accord et fenêtre de 12 mois (plan rendu).
12. Anciennes décisions encore ouvertes : D3, D6, D9, D14, D17, D18, D21, D24, D26, D27, D28 ; rétention des salariés sortis.

## 5. Suivi de l'audit du 27/09 (extraits)
CLOS : maillons 2, 6, 7 ; A2 ; D1, D2, D8, D12 ; § 8 ; R. 4412-5. CHANGÉ : D3 (10 au lieu de 11), D24 (non rayé), § 12 et § 15 MCP (non rayés). OUVERTS : D4, D5, D6, D9, D14, D17, D18, D21, D26, D27, D28 ; § 6 bis carnet (vert à 34 j, unités) ; § 16 (1) et (3).
Lignes closes et non rayées à rayer : § 2 vigilance, § 4 périmètre vigilance, § 6 bis « 80 % », § 12, § 15, D24.

## Suivi au 2026-10-12 (soir)

Ce que les lots **polir** (`lot/polir-integration`, `ed8b248e` : sept
branches fusionnées — `polir-entree-controle`, `polir-calendrier-registre`,
`polir-prestataires-carnet-accessibilite`, `polir-plans-permis-signatures`,
`polir-duerp-actions`, `etape-transverses-calculee`, `duerp-non-imprimes`)
et **polir-relecture** (`ed8b248e..712f9ef1`, seize commits) ont fermé,
constat par constat. Lu sur les commits et leurs diffs ; rouvert dans le code
pour B1, B3 et § 12/§ 15 des chantiers. `762c5033` (appareil retiré, sur
`lot/polir-relecture` après `712f9ef1`) n'est pas compté ici. Rien n'est
réécrit plus haut : « clos » dit ce qui est fait, « en partie » ce qui reste.

### Bloquants

| # | État | Par |
|---|---|---|
| B1 | Clos — l'aide cite R. 146-3 (28 m / 50 m, dernier plancher), écrite une fois (`aides-regimes.ts`) ; refus et couverture disent la même chose | `712619a7`, `1b33effe` |
| B2 | Clos — la réponse EPI se corrige à la fiche, le calendrier suit ; un EPI déclaré passe la réponse à « oui » | `d4b6366c`, `768826a6` |
| B3 | Clos — « Préparer un contrôle » dit ce que dit le ZIP ; le sens de « À jour » reste une décision (§ 4.7) | `2ec54a70` |
| B4 | Clos — « Modifier » la fiche prestataire (identité, contacts, validités, dates D. 8222-5, pièces) ; pastille et phrase accordées ; la pièce remplacée n'est plus effacée ; rattachement scopé | `955227d2`, `e70eed0f`, `8a380186` |
| B5 | En partie — un plan non signé se modifie, inspection commune comprise ; signé, la date ne s'enregistre plus et l'écran dit l'issue réelle (supprimer, refaire signer) | `644d6428`, `945c3d5e` |
| B6 | Clos — point, relevé et analyse se corrigent et se suppriment ; le calendrier, la matrice et le ZIP se relisent | `630855ed` |
| B7 | Clos côté code — plus de repli silencieux sur `localhost`, refus visible en production. La variable Vercel reste à poser par la propriétaire | `3baf0d81` |

### Importants

- **Corriger une saisie** — clos : action du plan (corriger, rouvrir, abandonner ; `ca2a03fb`, `cec83f7f`) ; permis de feu (`7bcb444f`) ; champ d'accessibilité vidé (`64cdbdd6`) ; risque décoché au DUERP, désormais confirmé (`69758b4e`). Ouvert : rapport de vérification seulement supprimable (décision § 4.8).
- **Écrans qui se contredisent** — clos : en-têtes de mois et « à confirmer » hors retard (D26, `7ef1be62`, `61ca6473`) ; permis « co-signé » sous « en attente » (`f43d254e`) ; signature attribuée par adresse (`798c6579`) ; registre d'accessibilité, neuf pièces et R. 164-6 entier (`64cdbdd6`, `5eff6bc1`) ; ERP repassé non-ERP plus publié (`64cdbdd6`) ; phrases IGH (`1b33effe`) ; registre PDF périmé (`fd7d4a94`) ; « Exercices » ERP à tort « à confirmer » (`d2068dcd`) ; fiche appareil et états permanents (`7078dee0`) ; « Quand ça arrive » marqué (`8677e3a8`) ; fil d'étapes du DUERP (`9db44bc0`, `3b249226`). En partie : manque en retard ADR-043 (d) — le bandeau le nomme, compté personne par personne (`d3a80f66`, `7be9d9aa`) ; le relevé « Dépassées », le rail et l'indice ne le comptent toujours pas (décision § 4.6).
- **Dire faux ou trop** — clos : échéance EPI respiratoire et gilet (`2132661f`) ; aide habitation (`712619a7`) ; carnet sur-annoncé (`630855ed`). En partie : « Préparer un contrôle » et « documents obligatoires » ne promettent plus l'exhaustivité (`2132661f`, `2ec54a70`) ; la liste complète reste une décision (§ 4.7). Ouvert : score « satisfaisante » sans DUERP (§ 4.5).
- **DUERP** — clos : CSV UTF-8 sans BOM, mesures à venir jamais « en place » (`c950ad76`, `fdb45f84`) ; PDF d'une version sans les versions postérieures (`4dc0ab5c`) ; motif du 1° de R. 4121-2 sous onze salariés (`202399e8`) ; expositions déclarées absentes gravées et imprimées (`f2acc3ee`). Ouvert : PDF figé, mesures « en place » comptées levées, écart majeur sans action, motif « première version » (§ 4.5).
- **Moteur et calendrier** — ouverts : décocher « travail » avec des salariés ; prescription qui renforce une obligation d'établissement.
- **Tiers** — clos : OTP, essai réservé avant comparaison, jeton consommé sous condition (`107b14da`) ; le dirigeant signe depuis son compte (`6b3ce9f8`) ; la modification révoque les liens en vol (`9d86bb16`) ; prestataire rattaché vérifié contre l'établissement (`de31ac78`). Ouverts : contre-signature § 10, Kbis et RC Pro (§ 4.1, § 4.2).
- **Périmètre annoncé** — ouverts, tous : lien après refus, PO/PU/PX, niveau audit dans PDF/ZIP/MCP (`lot/niveau-audit` non intégrée ici), MCP 7 sur 46 (D4).

### Peut attendre

Clos : slug d'accessibilité en double (`64cdbdd6`) ; SIRET en double (`955227d2`) ; statut du permis contrôlé côté serveur (`766419ef`) ; dates futures au carnet (`630855ed`) ; plan d'actions PDF « aucune action » sous trois levées (`ee862c23`). Ouverts : portées dépôt/consultation, ~~« À jour » carnet à 7 jours~~ [2026-10-13 : clos, `lot/controle-visuel-1310`], titre « registre incendie », filtres du registre, organisme facultatif, 4ᵉ refus, somme des effectifs, code mort `deduction-erp.ts`, motif « première version », titre redéclaré, export RGPD, conservation des sortis, notes « locaux à sommeil ».

### Hors liste, fermé en passant

Seuil des 400 h atteint en cours de chantier (R. 4512-7, 1° ; `137272c3`, `5a05e847`) — point 11 du § 4, en partie. Tenancy de `creerVersion` (`c5168bbc`). Version du moteur recopiée sans incrément, deux fois (`222e5def`, `712f9ef1`).

### § 5, lignes « closes et non rayées »

Rayées le 2026-10-12 sur `lot/docs-maj` : § 2 vigilance, § 6 bis « 80 % ». **Non rayées, parce qu'elles ne sont pas closes** : § 4 périmètre de la vigilance (B1 non tranchée, `EXCLUSIONS` inchangé ; seule l'annonce C45 a bougé) ; § 12 (MCP et registre PDF faits, la page ouverte par lien direct non — rayé en partie) ; § 15 MCP (l'axe `inventaire` n'atteint pas le MCP) ; D24 (le code suit la recommandation, la décision n'est pas tracée). Chacune porte une note datée.
