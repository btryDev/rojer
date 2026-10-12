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
Slug d'accessibilité en double ; SIRET en double ; portées « dépôt »/« consultation » jamais émises ; statut du permis non contrôlé côté serveur ; « À jour » carnet à 7 jours (texte : mensuel) ; dates futures acceptées ; plan d'actions PDF « aucune action » avec 3 levées ; titre « registre incendie » pour tous ; filtres du registre à 3 domaines ; organisme facultatif ; 4ᵉ refus implicite (0 salarié) ; somme des effectifs des sites ; code mort `deduction-erp.ts` ; motif « première version » ; titre redéclaré écrasé sans historique ; export RGPD sans calendrier ni actions liées ; conservation des sortis sans durée ; notes « locaux à sommeil » périmées sur deux obligations électriques (rebranchement).

## 4. Décisions qui reviennent à la propriétaire
1. Kbis semestriel (après Légifrance) ; RC Pro sous la vigilance ou à part.
2. Contre-signature (§ 10) : horodatage tiers ; ce que voit le porteur du lien avant le code ; portées dépôt/consultation : faire ou retirer.
3. Accessibilité : déposer les pièces de l'art. 1er ou annoncer qu'elles restent hors Rojer ; attestation annuelle de formation (1ʳᵉ–4ᵉ cat.).
4. Carnet : une analyse ≥ 1000 UFC/L crée-t-elle une action ? seuil 7 jours ou mensuel.
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
