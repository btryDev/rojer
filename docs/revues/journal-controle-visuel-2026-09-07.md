# Contrôle visuel du 2026-09-07 — journal au fil de l'eau

Base **locale** (`localhost:5435`, conteneur `duerp-verif-db`), `origin/main` à
`7dd627f`. Rien de poussé, rien de commité. Aucune écriture sur le Supabase de
production : aucun compte créé, confirmé ni supprimé.

## 1. Ce que la mise en place a appris avant d'ouvrir un écran

**Trois migrations manquaient à la base locale** — `20260904120000_categorie_epi`,
`20260904160000_categories_epi_verifiables`,
`20260904180000_equipement_date_peremption`. Appliquées avec
`prisma migrate deploy` (jamais `migrate dev` : il vide la base pointée par
`DIRECT_URL`). Sans elles, les écrans du parc auraient rendu une erreur de
colonne absente qu'on aurait prise pour un défaut d'interface.

`prisma migrate status` avant : « 50 migrations found · Following migrations have
not yet been applied ». Après : « All migrations have been successfully applied ».

## 2. Deux prémisses du brief qui ne tiennent pas sur cette machine

- **Le dépôt.** `git remote -v` rend toujours `btryDev/testDuerp.git`, et
  `git fetch` fonctionne (GitHub redirige un dépôt renommé). Le
  `git remote set-url` n'était pas nécessaire — il n'a pas été fait.
- **Le port.** Le `.env` du dépôt pointe `localhost:5435`, pas 5433. Les deux
  conteneurs existent (`duerp-verif-db` en 5435, `duerp-postgres` en 5433) ;
  c'est 5435 qui porte le dossier de contrôle et qui a un
  `SHADOW_DATABASE_URL`. Rien n'a été repointé.

## 3. Blocage : l'extension navigateur n'est pas connectée

`tabs_context_mcp` rend « Browser extension is not connected ». Le serveur de
développement répond (`curl -o /dev/null -w "%{http_code}" http://localhost:3000/`
→ `200`) et le dossier local est intact (1 entreprise, 2 établissements,
20 équipements, 10 salariés, 72 vérifications, 2 permis de feu, 2 plans de
prévention, 2 carnets sanitaires). **La passe sur les sept écrans ne peut pas
commencer tant que Chrome n'est pas ouvert.**

## 4. Audit du § 7 contre le code — sept constats sur onze sont clos

Vérifié dans le code, pas de mémoire. Aucun n'était barré dans le document.

| Constat du § 7 | État | Preuve |
|---|---|---|
| `J−3` sur une ligne en retard | **clos** | `widgets/temps.ts:142` rend `` `${-j} j de retard` ``, et l'en-tête du fichier documente la correction |
| « N échéances à traiter cette semaine » | **clos** | déjà barré au § 7 |
| Espace avalée `/registre` | **clos** | `registre/JaugeRegistre.tsx:102` porte `{" "}` |
| Espace avalée `/prestataires` | **clos** | `prestataires/page.tsx:154` porte `{" "}` |
| (les deux ci-dessus, structurellement) | **clos** | `lib/rendu/espaces-avalees.ts` balaie tout `src` par `readdirSync` — pas une liste écrite à la main ; 23 tests verts |
| 3ᵉ carte de zone tranchée en plein glyphe | **clos** | `hero-batiments.tsx:85` `LARGEUR_PLANCHER = 116` + prop `souple` |
| « À jour » sur une zone à 0 équipement | **clos** | `lib/batiments/etat-charge.ts` — trois états fermés, `sansObjet` évalué avant tout comptage |
| `/equipements` : « portent sur tout l'établissement » | **clos** | la phrase ne subsiste que dans des commentaires qui documentent sa correction (`BandeauParc.tsx:23`, `porteurs-comptes.ts:6`) ; aucune chaîne vivante |

**Traités, à confirmer d'un coup d'œil quand l'écran sera ouvert :**

- **Îlot de navigation translucide sur la section claire.** `globals.css:682`
  passe le champ de 58 % à **88 %** de blanc, calculé sur le pire fond (le noir)
  pour tenir 4,5:1. Le commentaire nomme exactement le défaut du § 7. Reste 12 %
  de transparence : à regarder, pas à supposer.
- **Pastille « Engagement d'assurance » absente du widget « À faire ».**
  `widgets/impl/echeances.tsx:154` et `:288` rendent désormais
  `MentionContractuelle`. Qu'elle soit bien la pastille ambre attendue se voit,
  ne se lit pas.

**Non vérifiés :** le guide bloqué à « étape 4 sur 6 », et l'aplat noir de ~4 s
sur le héros de la page d'accueil (probablement un artefact du mode
développement — à mesurer en `next build`, pas en `next dev`).

## 5. Ce qui a déjà été regardé à l'écran, et que le § 5 croit injugeable

Le § 5 est arrêté au 2026-09-02. Quatre des sept écrans qu'il dit « jamais
ouverts avec des données » l'ont été les 2026-09-04 à 06, sur un dossier semé par
`seed:complet`, avec une session ouverte : **`/equipe`** (liste et fiche
salarié), **`/duerp`** (unités, risques, import, synthèse), **`/accessibilite`**
(page publique des deux établissements + affiche A4) et **`/plan-actions`**
(fiche d'une action).

Restent réellement jamais ouverts : **`/permis-feu`**, **`/plan-prevention`**,
**`/carnet-sanitaire`**.

---

# Passe sur les trois écrans jamais ouverts

Session ouverte par la propriétaire elle-même sur `localhost:3000/login`
(formulaire jamais soumis par l'agent). Dossier semé, établissement
`cmtko3ynv0002circ3350z6v0`.

## `/plan-prevention` — l'écran énonce un fait faux

**Ce qui s'affiche**, fiche du plan PP-001 :

    DURÉE ESTIMÉE
    22 h
    seuil des 400 h franchi          ← la note sous la valeur

**Ce qu'on attendait** : 22 h ne franchit pas 400 h. Le plan écrit est bien
obligatoire ici, mais par l'autre branche — les travaux figurent sur la liste
dangereuse de l'arrêté du 19 mars 1993.

**Cause, une ligne.** `plan-prevention/[planId]/page.tsx:89` :

    note: diag.ecritObligatoire ? "seuil des 400 h franchi" : undefined,

et `lib/plan-prevention/schema.ts:163` :

    const ecritObligatoire = seuil400 || params.travauxDangereux;

La note est tirée du OU, pas du seuil. Le diagnostic **calcule déjà la bonne
phrase** — `raisons[]` contient « Les travaux figurent sur la liste dangereuse
(arrêté 19-03-1993) » — et la fiche la jette pour réécrire un motif à la main.
C'est l'écran qui dit au dirigeant sur quel fondement juridique son document est
dû ; il se trompe de fondement.

## `/plan-prevention` et `/permis-feu` — la carte « Cycle de vie » n'offre que la suppression

**Ce qui s'affiche** : une carte titrée « Cycle de vie » dont tout le contenu est
un bouton **Supprimer**. Sur les deux fiches.

**Pourquoi.** Le plan est en `inspection_faite` ; `plan-prevention/[planId]/page.tsx:219`
ne rend « Clôturer » que pour `valide` ou `attente_signatures`. L'énumération
compte six états (`brouillon`, `inspection_faite`, `attente_signatures`,
`valide`, `clos`, `annule`) et la carte en sert trois. Aux trois autres, le seul
geste proposé sous un titre qui promet un cycle est **le geste destructif**.

Le permis est en `attente_signatures` avec 0 signature ; la condition
`signatures.length >= 2` (`permis-feu/[permisFeuId]/page.tsx:266`) est juste — on
ne démarre pas avant les deux signatures — **mais la carte ne le dit pas**. La
branche `en_cours`, elle, explique son attente (« Surveillance de 2 h … avant de
pouvoir clore »). L'écran explique donc dans certains états et se tait dans
d'autres, en laissant « Supprimer » seul à l'écran.

## `/carnet-sanitaire` — le vert sur une donnée périmée

**Ce qui s'affiche**, carte « Retour de boucle » :

    55.0°        Dans la plage          (pastille verte)
    Dernier relevé le 04 août 2026 · par Gérant
    100% dans la plage

**Ce qu'on attendait** : nous sommes le 7 septembre. Le dernier relevé a 34
jours, et rien sur la page ne dit quand le suivant est dû ni que le suivi a
cessé. Le vert porte sur la dernière valeur mesurée, pas sur la tenue du
registre — mais il se lit comme un état courant. C'est la famille du défaut
« À jour sur une zone à zéro équipement », corrigé le 2026-09-04 : un état vert
affirmé sur une donnée qui ne le porte pas.

## Typographie — trois écritures d'une même unité sur une seule carte

`/carnet-sanitaire`, carte « Retour de boucle » :

    SEUIL MIN 50°C      (bandeau)
    55.0°               (valeur, point décimal, sans C)
    60° / 50° / 45°     (axe du graphique, sans C)
    100% dans la plage  (sans espace avant %)

Le français écrit « 55,0 °C » et « 100 % ». Le produit écrit « 5 % » et « 80 % »
ailleurs — la convention existe et n'est pas tenue ici.

Et sur `/permis-feu`, la **même statistique** s'écrit des deux façons :

    permis-feu/page.tsx:120        « 80 % des incendies de travaux… »
    lib/permis-feu/referentiel.ts:140  « c'est là que 80% des incendies… »

## Deux idiomes de navigation pour trois registres frères

`/permis-feu` et `/plan-prevention` ouvrent sur un **retour**
(« ← LE COMPTOIR DES HALLES ») ; `/carnet-sanitaire` sur un **fil d'Ariane**
(« Le Comptoir des Halles › Carnet sanitaire »). Même relation — un registre de
l'établissement —, deux rendus. L'ADR-014 distingue les deux assertions ; ici
elles désignent la même chose.

## Ce qui est bon, et mérite d'être dit

La check-list INRS ED 6030 du permis (14 points, trois groupes, « 1 obligatoire
non cochée » en rouge), le tableau risque ↔ mesure en vis-à-vis des deux
entreprises du plan de prévention, et les graphiques du carnet avec leur bande
rouge sous le seuil : ces trois-là se lisent sans effort et ne trichent pas.

## Confirmé à l'écran : le contenu minimal de `R. 4512-8`

Le § 6 le donnait pour mesuré, personne ne l'avait vu. La fiche d'un plan porte
la nature des travaux, l'inspection commune, les risques d'interférence et les
signatures. **Ni premiers secours, ni instructions aux travailleurs, ni
organisation du commandement** — et Rojer émet le document.
