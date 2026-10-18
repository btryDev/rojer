# Registre de sécurité — écart entre l'existant et un registre réel

Analyse du 2026-08-26, branche `feat/registre-securite-incendie-complet`.

Source de comparaison : `Registre_Securite_Incendie_btry.pdf` (62 p.), registre
papier vierge au format classique — 5 parties, ~35 fiches.

⚠️ Les références réglementaires citées ci-dessous sont celles **déjà présentes
et relues dans le code** (`src/lib/referentiels/conformite/incendie.ts`,
`src/lib/pdf/RegistreDocument.tsx`). Toute référence nouvelle introduite lors de
l'implémentation doit être recoupée sur Légifrance avant d'être écrite.

---

## 1. Ce que l'application appelle aujourd'hui « registre »

`src/lib/pdf/RegistreDocument.tsx` — une page A4, deux tableaux :

1. Rapports de vérification archivés (date, obligation, équipement, organisme, résultat)
2. Vérifications en attente ou programmées (échéance, obligation, équipement, statut)

Plus un bloc de mentions légales. C'est un **extrait du calendrier de
conformité**, pas un registre de sécurité : il couvre la partie 3.1/3.2 du
registre réel, et rien d'autre.

## 2. Structure du registre réel

| Partie | Contenu | Couverture actuelle |
|---|---|---|
| 1 Organisation | Renseignements généraux, ERP, téléphones utiles, service de sécurité | ~20 % |
| 1.1 Exercices périodiques | Thèmes + comptes-rendus | **0 %** |
| 2 Inventaire des moyens de secours | 2.1 matériel d'intervention, 2.2 installations/dispositifs | ~35 % |
| 3 Vérifications et contrôles | 3.1 extinction, 3.2 installations, 3.3 constructions, 3.4 administratif | ~50 % (3.1/3.2), 0 % (3.3/3.4) |
| 4 Événements | Comptes-rendus d'incendie ou de début d'incendie | **0 %** |
| 5 Annexes | Pièces libres | 0 % (le stockage existe) |

---

## 3. Écarts détaillés, par origine de la donnée

Trois origines possibles : **[BASE]** déjà en base, à exposer ;
**[USER]** à demander au dirigeant ; **[DEDUIT]** calculable ou récupérable
d'une source externe.

### 3.1 Partie 1 — Organisation

| Fiche | Champ manquant | Origine |
|---|---|---|
| Renseignements généraux | Raison sociale, adresse | [BASE] `Entreprise`, `Etablissement` |
| | **Nature de l'activité** (texte libre) | [USER] — le code NAF est en base mais n'est pas la nature d'activité au sens du registre |
| | **Adresse du siège social** si différente | [USER] |
| Renseignements généraux ERP | Type, catégorie | [BASE] `typeErp`, `categorieErp` |
| | **Effectif du public susceptible d'être admis** | [USER] — distinct de `effectifSurSite` et de `personnesPresentesHabituellement` |
| | **Date d'autorisation d'ouverture** | [USER] |
| | **Date du certificat de conformité** | [USER] |
| Téléphones et adresses utiles | 18 / 15 / 17 / 112 | [DEDUIT] constantes |
| | Gendarmerie, EDF secours, GDF secours, service des eaux, hôpital, centre anti-poison, centre des brûlés | [DEDUIT] partiellement (anti-poison et centre des brûlés = listes nationales par région) + [USER] pour le reste |
| | Mairie, préfecture, inspection du travail, service prévention CARSAT | [DEDUIT] via l'Annuaire de l'administration (api-lannuaire.service-public.fr) + geo.api.gouv.fr à partir du code postal |
| | Médecin, ambulances | [USER] |
| | Installateurs (eau, gaz, électricité, chauffage, appareils élévateurs, téléphone) | [BASE] partiellement — `Prestataire.domaines` couvre électricité, ventilation, ascenseur, incendie ; il manque eau, gaz, chauffage, téléphonie |
| | Organismes agréés chargés des vérifications | [BASE] `Prestataire.estOrganismeAgree` |
| Service de sécurité | **Personnel d'encadrement** (direction, chef du service sécurité incendie, adjoint : nom, téléphone, bip) | [USER] — aucun modèle |
| | **Équipe professionnelle SSIAP** (chefs d'équipe, agents, certificat d'aptitude délivré le / par) | [USER] — aucun modèle |
| | **Équipes locales d'évacuation** (nom, secteur) — guides-files, serre-files | [USER] — aucun modèle |
| | **Agents de surveillance** (état nominatif) | [USER] — aucun modèle |

→ **Modèle manquant : `PersonnelSecurite`** (rôle, nom, téléphone, secteur,
certificat : intitulé / date de délivrance / organisme). Couvre les quatre
dernières lignes d'un coup. À rapprocher des SST et des équipiers de première
intervention, qui n'existent pas non plus en base.

### 3.2 Partie 1.1 — Exercices périodiques : le trou le plus net

Le référentiel **connaît l'obligation** (`incendie-travail-exercice-semestriel`,
R. 4227-39, champ R. 4227-34 relu le 2026-08-25) et le calendrier produit
l'échéance. Mais **rien ne permet d'enregistrer l'exercice réalisé** — or
R. 4227-39 impose précisément que « leur date et leurs observations soient
consignées sur un registre tenu à la disposition de l'inspection du travail ».
L'échéance ne peut donc être soldée que par un dépôt de fichier PDF, alors que
le registre attend un formulaire.

Le registre papier attend deux fiches :

1. **Thèmes** : date, nombre de participants, puis 8 thèmes cochables —
   instruction théorique (prévention de l'incendie / évacuation / moyens de
   secours), instruction pratique sur les moyens de secours, exercices
   d'extinction de feux, visite des locaux, rappel des consignes et procédures,
   exercice d'évacuation partielle ou totale, premiers secours et soins
   d'urgence — et signature de l'animateur.
2. **Comptes-rendus** : date, heure, nombre de participants, compte-rendu
   succinct, visa du chef de sécurité + visa de l'animateur.

→ **Modèle manquant : `ExerciceSecurite`** (date, heure, nbParticipants,
thèmes `String[]`, animateurNom, compteRendu, + deux signatures via `Signature`
avec un nouvel `ObjetSignable.exercice_securite`). Doit solder la
`Verification` correspondante comme le fait un `RapportVerification`.

### 3.3 Partie 2 — Inventaire des moyens de secours

`Equipement` porte catégorie, libellé, localisation, bâtiment, date de mise en
service et un JSON `caracteristiques`. Les fiches d'inventaire demandent des
colonnes que ce JSON ne porte pas :

| Fiche | Colonnes attendues | État |
|---|---|---|
| Extincteurs mobiles | n° d'appareil, portatif / sur roues, nature du produit, capacité, date de mise en service, marque, emplacement | seuls date + emplacement existent |
| Extincteurs automatiques | produit extincteur, marque, nombre de postes/réservoirs/bouteilles, fonctionnement avec/sans commande manuelle, locaux surveillés | absent |
| RIA et prolongateurs | n°, Ø nominal, longueur du tuyau, semi-rigide/souple, type de lance | catégorie `RIA` existe (migration 20260825130000), caractéristiques non |
| Matériels divers | ARI (n°, type, marque, mise en service), motopompes, brancards | absent |
| Ressources en eau | poteaux/bouches normalisés, réserves : n°, Ø alimentation, Ø sorties, emplacement | absent |
| Colonnes sèches / humides | n°, diamètre, emplacement | absent |
| Détection automatique | type, marque, n° de zone, nombre de détecteurs par zone, locaux surveillés | absent |
| Dispositifs d'alarme | type, marque, boîtiers de commande, diffuseurs | absent |
| Éclairage de sécurité | type, marque, emplacement | catégorie `BAES` existe, colonnes non |
| Portes coupe-feu | n°, pivotante/coulissante/autre, date d'installation, marque | absent |
| Volets et clapets CF | n°, marque, date d'installation | absent |
| Exutoires de fumées | n°, marque, mode de déclenchement, emplacement de la commande manuelle | catégorie `DESENFUMAGE` existe, colonnes non |
| Installations électriques | désignation, marque, type, puissance, diélectrique | absent |

Deux problèmes structurels derrière ce tableau :

- **Pas de granularité unitaire.** Un `Equipement` = un parc (`caracteristiques.nombre`),
  pas un appareil numéroté. Le registre attend une ligne par appareil, avec son
  numéro. Il faut soit un modèle `AppareilInventaire` fils d'`Equipement`, soit
  accepter que l'inventaire reste agrégé et le dire dans le PDF.
- **Marque et numéro n'existent nulle part**, quelle que soit la catégorie —
  ce sont pourtant les deux colonnes présentes sur presque toutes les fiches.
- Catégories absentes de l'enum : **paratonnerre**, **colonne sèche / humide**,
  **ressource en eau (poteau, bouche, réserve)**, **porte coupe-feu**,
  **clapet / volet coupe-feu**, **ARI**.

`PiecesEquipement.tsx` prévoit déjà les pièces jointes d'un appareil, mais le
modèle n'existe pas (« bientôt » dans l'UI).

### 3.4 Partie 3 — Vérifications et contrôles

Couvert pour l'essentiel (3.1 et 3.2) mais avec trois écarts :

1. **Le vérificateur agréé n'est pas une entité.** Chaque fiche du registre
   ouvre par « Vérificateur agréé / Adresse / Tél. ».
   `RapportVerification.organismeVerif` est un `String?` libre ; `Prestataire`
   existe avec `estOrganismeAgree`, adresse et téléphone, mais **aucune FK ne
   les relie**. → ajouter `RapportVerification.prestataireId` (SetNull, en
   gardant le snapshot texte, comme `PermisFeu.prestataireRaison`).
2. **Le visa manque.** Chaque ligne du registre papier porte un visa.
   `Signature` couvre déjà `rapport_verification` — il faut l'afficher dans le PDF.
3. **Colonnes de résultat spécifiques par famille.** Le registre attend, non pas
   un `ResultatVerification` à 4 valeurs, mais des colonnes propres :
   extincteurs → nombre vérifié / en bon état / à recharger / à éprouver / à
   réformer / à remplacer ; RIA et ressources en eau → pression statique,
   pression dynamique, débit ; colonnes sèches → accès à l'orifice, Ø de la
   colonne de vidange, état apparent, état des accessoires ; éclairage de
   sécurité → commutation automatique, mise au repos à distance, remise
   automatique en position veille, alarme sonore de retour de courant, état des
   batteries après une heure de fonctionnement. Ces données vivent dans le
   rapport PDF déposé, pas en base. **Décision à prendre** : les saisir (lourd,
   mais c'est le registre) ou assumer le renvoi au rapport joint — ce que le
   registre papier autorise lui-même par la colonne « Observations ou renvoi au
   rapport de l'organisme ».

**3.3 Vérifications des constructions — entièrement absent :**

| Fiche | Données | Origine |
|---|---|---|
| Dispositions constructives | date, vérificateur, observations, visa | [USER] |
| Dépoussiérage - Nettoyage | date, société de nettoyage, éléments (murs, plafonds, sièges, tentures, velours, filtres), observations, visa | [USER] — `DomainePrestataire.nettoyage` existe déjà |
| Essais de réaction et de résistance au feu | date, matériaux vérifiés, laboratoire agréé, classement, n° de procès-verbal | [USER] |

**3.4 Contrôles administratifs — partiellement adressable :**

| Fiche | État |
|---|---|
| Contrôle des commissions de sécurité (date, représentant, observations, visa) | `PrescriptionParticuliere` avec ~~`SourcePrescription.pv_commission_securite`~~ une source `autre` [2026-10-18 : deux sources seulement] couvre les **prescriptions issues** d'un PV, pas le **passage** de la commission lui-même. Un passage sans prescription n'est nulle part. |
| Contrôle de l'administration | absent — ~~`SourcePrescription.inspection_travail` / `arrete_prefectoral` / `arrete_municipal` sont proches~~ [2026-10-18 : ces sources n'existent plus ; un tel acte se saisit en `autre`] |
| Autres contrôles | absent |

→ **Modèle manquant : `ControleAdministratif`** (type, date, autorité
représentée, représentant, observations, pièce jointe, visa). Les
`PrescriptionParticuliere` en découleraient plutôt que de le remplacer.

### 3.5 Partie 4 — Événements

Fiche « Comptes rendus d'incendie ou de début d'incendie » : date, heures,
circonstances, matériels utilisés. **Absent.** `Intervention` est un ticket
terrain, et ADR-018 acte le retrait du module.

Le registre ERP consigne aussi **les travaux et toute modification importante**
(mention déjà présente dans `incendie.ts`, obligation
`registre-securite-consignation`) — non modélisé. `PermisFeu` et
`PlanPrevention` couvrent les travaux d'entreprise extérieure, pas les
aménagements.

→ **Modèle manquant : `EvenementRegistre`** (type : `debut_incendie` |
`incendie` | `travaux` | `modification_importante` | `sinistre_autre`, date,
heure, description, matériels utilisés, suites données, pièces jointes).

### 3.6 Partie 5 — Annexes

Aucun emplacement pour les pièces libres (plans d'évacuation, PV de commission,
notices, rapports d'organisme hors échéance). Le stockage fichier existe
(`FileStorage`, `fichierCle`) ; il manque un `PieceJointeRegistre`.

---

## 4. Question préalable : quel registre ?

Le PDF fourni est un **registre de sécurité incendie ERP** (fondement CCH). Le
document produit aujourd'hui par l'application invoque `L. 4711-5 CT` +
`R. 143-44 CCH` + `R. 146-35 CCH` dans un même bloc, et s'appelle
« Registre de sécurité ».

Ce sont deux obligations distinctes, avec des contenus distincts :

- côté **travail** : registre unique de sécurité (L. 4711-5 CT), qui réunit les
  rapports de vérification et la consignation des exercices (R. 4227-39) ;
- côté **ERP** : registre de sécurité incendie, qui ajoute l'organisation du
  service de sécurité, l'inventaire des moyens de secours, les passages de
  commission et les événements.

`Etablissement` porte déjà les régimes cumulables (ADR-004 : `estERP`,
`estEtablissementTravail`, `estIGH`, `estHabitation`). **Le registre devrait
donc être composé selon les régimes actifs**, et non produit à l'identique pour
tous. Un bureau non-ERP de 8 personnes n'a pas à recevoir une fiche
« Équipe professionnelle de sécurité incendie ».

Cette décision commande tout le reste — elle mérite un ADR.

---

## 5. Ce qu'il faut décider avant d'écrire du code

1. **Registre composé par régime** (ERP / travail / IGH) ou registre unique ?
2. **Inventaire unitaire** (une ligne par appareil numéroté) ou agrégé
   (l'existant) ? C'est le choix le plus structurant et le plus coûteux à saisir.
3. **Résultats de vérification détaillés** en base, ou renvoi au rapport joint ?
4. **Où s'arrête la saisie utilisateur ?** Les fiches 1 (téléphones, service de
   sécurité) et 3.3 (constructions) demandent beaucoup de saisie pour un
   dirigeant seul. Un registre à moitié vide reste-t-il utile, ou vaut-il mieux
   n'imprimer que les parties renseignées ?
5. **Récupération automatique** des contacts administratifs (mairie, préfecture,
   DDETS, SDIS, CARSAT) via l'Annuaire de l'administration : dans le périmètre,
   ou hors V2 comme l'intégration SIRENE ?

## 6. Modèles Prisma manquants, en résumé

| Modèle | Couvre | Priorité |
|---|---|---|
| `ExerciceSecurite` | 1.1 — obligation déjà au calendrier, sans moyen de la solder | **1** |
| `PersonnelSecurite` | 1 — encadrement, SSIAP, équipes d'évacuation, agents de surveillance | 2 |
| `ControleAdministratif` | 3.4 — commissions de sécurité, administration, autres | 2 |
| `EvenementRegistre` | 4 — incendies, débuts d'incendie, travaux, modifications | 3 |
| `AppareilInventaire` (ou extension de `caracteristiques`) | 2.1 / 2.2 — n°, marque, capacité, Ø… | 3 |
| `ContactUtile` | 1 — téléphones et adresses utiles | 4 |
| `VerificationConstruction` | 3.3 — dispositions constructives, nettoyage, essais au feu | 4 |
| `PieceJointeRegistre` | 5 — annexes | 4 |

Champs à ajouter sur l'existant :

- `Etablissement` : `natureActivite`, `adresseSiegeSocial`, `effectifPublicAdmis`,
  `dateAutorisationOuverture`, `dateCertificatConformite`
- `RapportVerification` : `prestataireId` (FK SetNull) + adresse/téléphone du
  vérificateur au snapshot
- `Equipement` : `marque`, `numeroSerie` (ou via `AppareilInventaire`)
- `CategorieEquipement` : `PARATONNERRE`, `PORTE_COUPE_FEU`, `CLAPET_COUPE_FEU`,
  `COLONNE_SECHE`, `COLONNE_HUMIDE`, `RESSOURCE_EAU`, `ARI`
- `ObjetSignable` : `exercice_securite`, `controle_administratif`
- `DomainePrestataire` : `eau`, `gaz`, `chauffage`, `telephonie`

## 7. Le document PDF lui-même

Indépendamment des données, `RegistreDocument.tsx` doit devenir un vrai
document : page de garde (établissement, adresse, date de mise à jour),
sommaire, découpage en 5 parties, et sur chaque fiche l'en-tête
« Feuille n° » + le pied « Date ou mise à jour : le … » qui font qu'un
registre est opposable page par page.
