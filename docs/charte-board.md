# La charte « board »

Le langage visuel de l'application. Écrit le 2026-08-27, à partir d'un relevé du
code — pas d'une maquette.

**Pourquoi ce document existe.** La charte était réelle mais dispersée : des
tokens dans `globals.css`, des classes dans `@layer components`, un kit dans
`ui-kit/fiche/`, et une trentaine de règles vivant en commentaires. Chacune
argumentée, plusieurs testées, aucune rassemblée. Conséquence pratique : pour
faire un écran, le réflexe est de copier le module fonctionnellement le plus
proche — et ce réflexe produit régulièrement un écran hors charte, parce que le
module le plus proche est souvent l'un des plus anciens.

**Ce document décrit ce qui est vrai dans le code**, avec ses emplacements. Il
n'invente rien. Quand il diverge du code, c'est lui qui a tort : relever à
nouveau, et le corriger.

---

## 0. Deux chartes cohabitent. Une seule est en vigueur.

C'est le premier fait à connaître, et celui qui coûte le plus cher à ignorer.

| | **Board** — en vigueur | **Papier** — dette |
|---|---|---|
| Tokens | `--board-*` | `--paper`, `--ink`, `--rule`, `--seal`, `--minium`, `--warm` |
| Classes | `carte-board`, `board-eyebrow`, `pastille-board`, `champ-board`, `board-titre` | `cartouche`, `label-admin`, `filet-pointille` |
| Enveloppe | `px-[var(--board-gutter)]`, pleine largeur | `mx-auto max-w-5xl px-6` |
| Rayons | 30 / 22 / 18 / 16 px | 6 px |
| Écrans | calendrier, équipements, registre, fiches, tableau de bord, **prestataires, équipe, chrome, auth, onboarding, permis de feu, plans de prévention, actions, prescriptions, bâtiments, fiche établissement** | **DUERP, guide « Comprendre », carnet sanitaire, accessibilité, signatures et pages publiques** |

*(Relevé au 2026-08-27, après la vague de migration. Le tableau se corrige à
chaque module repris — un document qui retarde sur le code envoie chercher un
modèle là où il n'y en a plus.)*

Les écrans « papier » ne sont pas des exemples : ce sont des écrans à reprendre.
Les copier produit un écran **immédiatement discernable** du reste — même
palette, mêmes mots, mais un rayon de 6 px au milieu d'une carte à rayon 30, et
un gris qui n'appartient pas à la famille.

Le piège a changé de côté, et c'est utile de savoir pourquoi. **Prestataires**
était le module fonctionnellement le plus proche d'un annuaire — des tiers, des
pièces qui expirent, des pastilles d'alerte — et il était en papier : on allait
naturellement le copier, et on repartait avec la mauvaise charte. Il est
maintenant board, et c'est **le** modèle à copier pour un annuaire : liste,
carte, fiche, formulaire. Le piège est aujourd'hui le **DUERP**, gros, central,
et entièrement en papier.

Les deux couleurs hors palette signalées ici — `bg-amber-100 text-amber-900`
dans les pastilles de vigilance, `text-indigo-700` dans l'état vide — ont été
supprimées le 2026-08-27.

---

## 1. Les tokens

Tous dans `src/app/globals.css`, un seul `:root` (l. 49-193). Les commentaires
qui les accompagnent portent les ratios de contraste et l'historique des
valeurs : les lire avant de changer une teinte.

### 1.1 La gouttière — seul token d'espacement

```css
--board-gutter: clamp(32px, calc((100vw - 1560px) / 2 + 32px), 140px);
```
`globals.css:90`. Fixe à 32 px jusqu'à ~1500 px de viewport ; au-delà elle
absorbe la moitié du surplus de chaque côté — la zone utile cesse de s'élargir
vers 1190 px — puis plafonne à 140 px.

**Un écran board n'utilise jamais `mx-auto max-w-*`.** Il utilise
`px-[var(--board-gutter)]`.

### 1.2 Surfaces

| Token | Valeur | Rôle |
|---|---|---|
| `--board-canvas` | `#f6f9fb` | Fond de page, **derrière** les cartes (sauf le tableau de bord, blanc sous son hero depuis le 2026-10-25) |
| `--board-card` | `#ffffff` | Surface de carte, bandeaux d'en-tête |
| `--board-ink` | `#0a0a0a` | Encre principale, boutons pleins |

Le canvas n'est pas un gris neutre : c'est un bleu très pâle de la même famille
que le reste. Un gris « mort » y avait été essayé et retiré.

### 1.3 Bleu glacier — le registre calme et actif

| Token | Valeur | Rôle |
|---|---|---|
| `--board-blue-pale` | `#d8eef9` | **Champ** des pilules et tuiles |
| `--board-blue-soft` | `#a9d3ec` | Champ de l'état « lointain » |
| `--board-blue-strong` | `#5d93b8` | Contour de focus |
| `--board-blue-ink` | `#376881` | **Encre** de la famille, liens secondaires |

Couple canonique, employé une cinquantaine de fois :
`bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]`.

### 1.4 Ardoise — le texte et les filets

| Token | Valeur | Rôle |
|---|---|---|
| `--board-slate-pale` | `#edf2f5` | **Surface creuse** : sous-blocs, hover, champ de saisie |
| `--board-slate-line` | `#dfe8ee` | **Filets et séparateurs** |
| `--board-slate` | `#b5d1e3` | Graduations, pointillés — **jamais une encre** (~1,6:1) |
| `--board-slate-soft` | `#5c7182` | Sur-titres, petits labels |
| `--board-slate-mid` | `#4d5d6b` | **Texte courant secondaire** — le gris de travail |
| `--board-slate-ink` | `#304148` | Texte appuyé |

### 1.5 États — un champ, une encre, jamais l'un sans l'autre

| État | Champ | Encre |
|---|---|---|
| En retard | `--board-signal` `#ff9d9e` | `--board-signal-ink` `#8a2a23` |
| Proche (< 30 j) | `--board-amber` `#fff3ba` | `--board-amber-ink` `#754d0a` |
| Lointain | `--board-blue-soft` | `--board-blue-ink` |
| Fait | `--board-green` `#bdfdb5` | `--board-green-ink` `#216037` |
| À planifier | `--board-slate-pale` | `--board-slate-mid` |

**La source unique est `src/lib/calendrier/etats.ts`** — `CHAMP_ETAT` et
`ENCRE_ETAT`. Ne jamais redéclarer une table de couleurs locale : elles ont
existé en trois exemplaires, et un mois « à venir » rendu rose dans un seul des
trois suffit à faire lire un futur comme un retard.

Voiles de ligne entière : `--board-signal-wash` `#fff5f5`, `--board-amber-wash`
`#fffaf0`.

### 1.6 Rayons — pas de token, mais une échelle

Les valeurs sont des littéraux. L'échelle de fait :

| Rayon | Emploi |
|---|---|
| `30px` | Carte board |
| `28px` | Tuile-date de fiche (84 px) |
| `26px` | Panneau modal |
| `22px` | Sous-bloc creux, vignette |
| `18px` | Bloc interne |
| `17px` | Tuile-date de liste (50 px) |
| `16px` | Champ de saisie |
| `9999px` | Pastilles, boutons |

**Exception, la pastille d'article (`LegalBadge`, 2026-10-16)** : une
référence peut passer à la ligne (« R. 157-1, 1° (obligation de détenir…) »).
Elle prend alors le rayon du bloc interne, `18px`, et s'aligne à gauche
(`text-left`) — à `9999px`, un texte de plusieurs lignes devient une bulle
ovale centrée (contrôle visuel du lot défibrillateur, 500 px). Sur une seule
ligne (~26 px de haut), le navigateur ramène 18 px à la demi-hauteur : la
forme reste celle d'une pastille. La variante papier (dette) garde
`rounded-full` mais s'aligne aussi à gauche. Tenu par `LegalBadge.test.tsx` ;
ne pas « réaligner » ce composant sur `.pastille-board`.

Règle relevée pour les marques carrées : `borderRadius: Math.round(taille * 0.34)`.

### 1.7 Ombres — trois recettes, jamais une quatrième

Toutes sur `rgba(13, 18, 36, α)` — un bleu-noir, pas du noir pur. Celle de la
carte est dans `.carte-board` ; **ne pas la recopier en littéral**, elle a déjà
vécu en trois exemplaires. Une copie non résorbée subsiste dans
`components/calendrier/SectionMois.tsx:47`, `app/etablissements/[id]/calendrier/page.tsx:1030`
et `components/dashboard/widgets/impl/board.tsx:105` — **trois**, relevées le
2026-08-27, et non une seule comme l'affirmait ce document.

---

## 2. Les classes

Dans `@layer components` de `globals.css`.

### `.carte-board` (l. 808)
```css
background: var(--board-card);
border-radius: 30px;
box-shadow: 0 0 0 1px rgba(13,18,36,.06), 0 1px 2px rgba(13,18,36,.04),
            0 12px 32px -14px rgba(13,18,36,.1);
```
Gouttières internes canoniques : **`px-7 py-6 sm:px-8`**.

### `.board-eyebrow` (l. 774)
JetBrains Mono, 11 px, 500, `letter-spacing: .2em`, capitales,
`--board-blue-ink`. En pratique presque toujours surchargée, sous deux formes :

- **section** : `board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]`
- **ligne / sous-bloc** : `board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]`

### `.pastille-board` (l. 821)
`inline-flex`, `gap: 7px`, `rounded-full`, `padding: 6px 13px`, `12px`, 600.
**La forme, pas la couleur** : le couple champ/encre vient des jetons d'état ou
de `PastilleFiche`.

### `.board-titre` (l. 793)
Instrument Sans, 600, `letter-spacing: -.032em`, `line-height: 1.12`,
`text-wrap: balance`.

### `.champ-board` / `.label-board` (l. 838, 862)
Le champ de formulaire du board : rayon 16, fond `--board-slate-pale`, bordure
`--board-slate-line`, 13.5 px, focus en `outline: 2px solid --board-blue-strong`.

**Les primitives `Input` / `Label` de `ui/` ne sont pas une alternative** : leur
rayon de 6 px sonne comme un encart d'un autre logiciel au milieu d'une carte à
rayon 30. Elles restent en place sur les écrans non repris, c'est tout.

---

## 3. Typographie

Trois polices, chargées dans `src/app/layout.tsx` :

| Variable | Police | Emploi |
|---|---|---|
| `--font-body` | IBM Plex Sans | Corps et interface |
| `--font-titre` | Instrument Sans | `.board-titre` |
| `--font-mono` | JetBrains Mono | Sur-titres, tuiles-date, dates |

### Le barème, par rôle

| Rôle | Motif |
|---|---|
| Titre de page | `board-titre m-0 text-[clamp(29px,3vw,39px)]` |
| Titre de liste | `board-titre m-0 text-[clamp(22px,2.2vw,27px)]` |
| Titre de fiche | `board-titre m-0 text-[clamp(23px,2.1vw,30px)]` |
| Titre de section / carte | `board-titre m-0 text-[22px]` |
| Sur-titre de section | `board-eyebrow text-[10.5px] tracking-[0.18em]` + `--board-slate-soft` |
| Sur-titre de ligne | `board-eyebrow text-[10px] tracking-[0.16em]` + `--board-slate-soft` |
| Chapeau de page | `text-[14.5px] leading-[1.55]` + `--board-slate-mid` + `max-w-[var(--board-mesure)]` |
| Corps de carte | `text-[13.5px] leading-[1.6]` + `--board-slate-mid` |
| Corps explicatif | `text-[12.5px] leading-[1.55]` + `max-w-[var(--board-mesure)]` |
| Titre de ligne | `text-[16px] font-semibold leading-[1.3] tracking-[-0.01em]` + `--board-ink` |
| Méta de ligne | `text-[12.5px]` + `--board-slate-mid` |
| Clé de champ (`dt`) | `text-[12.5px]` + `--board-slate-mid`, `sm:w-[168px]` |
| Valeur de champ (`dd`) | `text-[14px] leading-[1.45]` + `--board-ink` |
| Fil de retour | `font-mono text-[10.5px] uppercase tracking-[0.16em]` |
| ~~Fil d'Ariane~~ | ~~`text-[12.5px]` + `--board-slate-mid`, page courante en `--board-ink` `font-medium`, chevron `›` en `--board-slate` — `FilAriane`, seul composant (ADR-014 : où la page est rangée)~~ [2026-10-25 : retiré des pages d'entrée avec le composant, décision de la propriétaire — la marque du rail et la gélule de compte mènent à l'établissement ; le retour de provenance des fiches reste `FilRetour`.] |

**Règle de `tracking`** : positif (0.1 → 0.2em) uniquement en mono capitales.
Négatif (−0.01 → −0.032em) sur les titres. Rien entre les deux.

**Les chiffres portent toujours `tabular-nums`.**

~~Les largeurs de texte sont bornées : `max-w-[62ch]` / `[66ch]` / `[68ch]`.~~
[2026-10-24, décision de la propriétaire] **Une seule mesure de lecture** :
`max-w-[var(--board-mesure)]`, le jeton `--board-mesure` de `globals.css`
(110 caractères). Les trois bornes recopiées à la main faisaient la mesure
d'un livre et coupaient en trois lignes une phrase d'aide sur un écran large.
Pour changer la mesure de toute l'app, on change ce chiffre ; un écran neuf
ne recopie jamais un nombre de caractères. `scripts/mesure-texte.sh`
ramène sur le jeton les anciennes bornes qu'un merge réintroduirait. Les
bornes plus étroites (titres, étiquettes, sous 60 caractères) restent.

---

## 4. Le kit

`src/components/ui-kit/fiche/` — « un seul jeu pour les cinq fiches qu'on ouvre
depuis le calendrier ». Réutiliser plutôt que refaire.

| Composant | Rôle |
|---|---|
| `EcranFiche` | L'enveloppe : fil de retour, bandeau optionnel, rythme `gap-[22px]` |
| `CorpsFiche` | `principal` / `cote` — les faits à gauche, le geste attendu à droite |
| `TitreSection` | Sur-titre + titre + compte + zone droite |
| `CarteFiche` | La carte. `titre` (eyebrow) et `titreFort` **s'excluent** |
| `ChampsFiche` / `ChampFiche` | La `<dl>` clé/valeur |
| `BlocCreux` | Sous-bloc `rounded-[22px]` sur `--board-slate-pale` |
| `HeroFiche` | Tête d'échéance : tuile-date, faits, pastilles |
| `PastilleFiche` | Pastille par **ton** : `retard` / `proche` / `fait` / `bleu` / `neutre` |
| `PastilleRetard` | « En retard de 13 jours » — le nombre, pas le mot |
| `LigneFiche` | Ligne de liste, avec voile d'état optionnel |
| `TuileDate` | Le carré de date, deux tailles (`liste` 50 px, `fiche` 84 px) |
| `FilRetour` | Le retour de provenance (ADR-014) |
| `AideEcran` | Le bouton `?` et son panneau |

Hors kit : `MarqueurFamille` / `MarqueurEcheance`, `BadgeStatut`,
`MarqueCategorie`, `ChampSaisie`.

### `ChampBoard` et `SectionChamps` — le formulaire

`src/components/ui-kit/ChampBoard.tsx`. **Sers-t'en plutôt que d'écrire un
champ à la main** : les classes `.champ-board` / `.label-board` existent, mais
chaque formulaire migré recopiait les mêmes six lignes — ou renonçait et
gardait les primitives `Input`/`Label` au rayon de 6 px.

Il porte les trois choses qu'on oublie une fois sur deux :

- l'astérisque des champs requis, posé par la prop `requis` plutôt qu'écrit
  dans le libellé, pour qu'il soit toujours au même endroit ;
- `aria-describedby` qui chaîne **l'aide ET l'erreur**, pas seulement l'une des
  deux ;
- l'erreur en `--board-signal-ink`, jamais en `text-destructive`, qui
  appartient à l'autre charte.

L'aide se passe en prop `aide`, jamais en infobulle (interdit 18) : une
infobulle n'existe pas au doigt.

`SectionChamps` groupe les champs sous un titre et un chapeau. **Il ne numérote
pas** : la numérotation ne se garde que si l'ordre porte une information — un
vrai déroulé, une chronologie. Sur un formulaire dont on remplit les champs
dans l'ordre qu'on veut, elle décore.

### La prop `charte` — la cohabitation, et son piège

`src/components/ui-kit/charte.ts`. Quatre composants du kit servent **les deux
chartes** : `LegalBadge` (19 appelants), `WhyCard`, `StatusPill`,
`SignatureBlock`. Ils prennent une prop `charte?: "board" | "papier"`.

**Le défaut est `"papier"`**, pour que les écrans non migrés ne cassent pas. La
conséquence est le piège : un appelant board qui oublie la prop obtient
**silencieusement** un encart papier au milieu de sa carte — pas d'erreur, pas
d'avertissement, juste un rayon de 6 px et un gris d'une autre famille.

Sur un écran board, passe donc `charte="board"` sur chacun de ces quatre.

Deux composants hors kit suivent le même contrat, **mais `SelecteurBatiment`
nomme sa prop `ton` et non `charte`** — antériorité, et piège de plus : un
appelant board qui écrit `charte="board"` dessus ne provoque aucune erreur et
obtient le rendu papier. `ChampBatiment`, lui, prend bien `charte`.

`ChampBatiment` n'a d'ailleurs **plus aucun appelant papier** depuis le
2026-08-28 : sa branche papier se retire au prochain passage.

La méthode, quand un composant partagé doit passer au board : **ajouter la
variante à côté**, laisser les appelants papier sur l'ancienne, retirer
l'ancienne quand le dernier est passé. C'est ce qu'a fait `ui/button.tsx`. Ce
fichier se vide, il ne se remplit pas.

### Boutons

`variant="board"` (encre pleine) et `variant="boardClair"` (contour),
`size="board"` (h-10) ou `"boardSm"` (h-8). Les variantes historiques parlent en
petites capitales monospacées — c'est le registre « document administratif », il
cohabite le temps que les écrans passent au board.

---

## 5. Les patrons d'écran

### La largeur de lecture — une exception, nommée

La règle est la gouttière : `px-[var(--board-gutter)]`, pleine largeur, jamais
`mx-auto max-w-*`. Elle vaut pour tout écran d'application — une liste, une
fiche, un formulaire pleine page.

**Deux exceptions, et seulement deux :**

1. **L'écran d'entrée étroit** — connexion, création de compte, formulaire isolé
   sans contexte. Un formulaire de 460 px n'a rien à étaler ; la gouttière le
   collerait à gauche devant 1200 px de vide. Colonne centrée, 460 px (560 si
   le contenu porte un déroulé).
2. **Le document de lecture suivie** — le DUERP. `duerp/[id]/layout.tsx` garde
   `max-w-5xl`, et l'argument tient : ces pages se lisent comme un document, en
   phrases longues, et une ligne de texte de 1400 px ne se lit pas. C'est la
   même raison qui borne les paragraphes à la mesure (`--board-mesure`) partout ailleurs — ici
   la borne porte sur l'enveloppe parce que c'est tout le contenu qui est de la
   prose.

**Ce que l'exception ne couvre PAS.** Elle porte sur la largeur, et sur rien
d'autre. Elle ne justifie ni `.cartouche`, ni `.label-admin`, ni `--minium` :
le DUERP passe au board comme les autres, dans une colonne plus étroite. La
confusion a coûté cher — l'argument de largeur a servi de raison à ne pas
toucher le module du tout.

Un tableau dense y déborde sa colonne ? Il défile dans son conteneur, comme
partout (voir ci-dessus).

### Tableau dense

La charte n'en avait pas, et c'est ce qui bloquait la reprise du DUERP — le
seul module qui en réclame. Le patron n'était pas à inventer : il existe déjà,
en board, dans `components/registre/FicheJournal.tsx`. Il est relevé ici pour
qu'il ne se réinvente pas à chaque écran.

```
<div className="overflow-x-auto">            ← le conteneur défile, jamais la page
  <table className="w-full min-w-[34rem] border-collapse text-[13.5px]">
    <caption className="sr-only">…</caption>  ← ce que le tableau montre, et son tri
    <thead>
      <tr className="border-b border-[color:var(--board-slate-line)] text-left">
        <th scope="col" className="board-eyebrow py-2 pr-4 text-[9.5px]
            font-semibold tracking-[0.12em] text-[color:var(--board-slate-soft)]
            last:pr-0">
    <tbody>
      <tr className="border-b border-[color:var(--board-slate-line)] align-top
          last:border-b-0">
        <td className="py-2.5 pr-4 leading-[1.55]
            text-[color:var(--board-slate-ink)] last:pr-0">
```

Ce qui s'y décide, et pourquoi :

- **Filets pleins et horizontaux seulement.** Pas de `divide-x` : une grille
  quadrillée ajoute autant de traits que de colonnes, et le regard suit les
  lignes, pas les cases. Le dernier `<tr>` perd son filet (`last:border-b-0`) —
  un trait au ras du bord de carte double celui de la carte.
- **L'en-tête est un sur-titre, pas un titre** : `.board-eyebrow` en 9,5 px,
  `--board-slate-soft`. Il nomme la colonne, il ne pèse pas autant que la
  donnée.
- **`min-w-` sur la table, `overflow-x-auto` sur son conteneur.** C'est le
  conteneur qui défile ; le corps de page ne défile jamais horizontalement.
- **`align-top`** : une cellule longue ne doit pas décentrer ses voisines.
- **Une `<caption class="sr-only">`** dit ce que le tableau montre et dans quel
  ordre il est trié. Sans elle, un lecteur d'écran entre dans une grille sans
  savoir ce qu'elle contient.
- **Une seconde information se range SOUS la première colonne**, en 11 px
  `--board-slate-soft`, plutôt que de prendre une colonne. Une colonne de plus
  se paie en largeur sur tous les écrans étroits.
- **Les chiffres portent `tabular-nums`** — règle générale de la charte, elle
  vaut particulièrement ici où ils s'alignent en colonne.

Le tableau vit **dans** une `.carte-board`, pas à côté : c'est la carte qui
porte la surface et le rayon, la table n'a ni fond ni bordure propres.


### Liste — modèle : `app/etablissements/[id]/equipements/page.tsx`

```
<main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
  <EnTetePage item="equipements" description="…" />     ← en-tête commun
  <BarreParc … />                                          ← comptes, ajout, zones
  <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
     … état vide, ou sections de cartes
  </div>
</main>
```

~~L'en-tête : `border-b border-[--board-slate-line] bg-[--board-card]
px-[var(--board-gutter)] py-[22px]`, avec à gauche un chevron rond, le `h1` et
son chapeau ; à droite les compteurs et le bouton d'action.~~
[2026-10-25 : l'en-tête est `EnTetePage`, commun à toutes les pages d'entrée
— voir « En-tête de page » ci-dessous. Les compteurs et le bouton d'action
descendent au-dessus de la liste, dans `BarreDeListe` (ou la barre propre au
module, comme `BarreParc`).]

### En-tête de page — `components/entete-page/EnTetePage.tsx` (2026-10-25)

Une seule façon d'ouvrir une page d'entrée du rail :

- **Le titre** est le nom du rail (`LABEL_ITEM`), sauf les quelques pages de
  `TITRE_EN_TETE` ; **une phrase** dit ce qu'on voit puis ce qu'on peut y
  faire ; **pas de fil d'Ariane** — la sidebar et la gélule de compte disent
  où l'on est.
- **Seule la bascule de vue** y vit (« Par mois / Par équipement »,
  « En permanence / En cas de… »). Année, filtres, aide, export, ajout
  descendent sur le bloc qu'ils règlent, **sous une autre forme** que la
  bascule (contour fin, coins à peine arrondis).
- **À droite, l'illustration** de la page sur un panneau de la **teinte de
  sa section** (`teintes.ts`), pleine hauteur, bord à bord. La teinte ne vit
  que là : jamais sur une carte, un bouton ou une pastille. Pas de dessin,
  pas de panneau.
- **Le coin haut droit est à la gélule de compte**, qui flotte au-dessus :
  rien n'y passe dessous qu'un fond ou une image.
- Les illustrations partagent leur cadre et leurs motifs
  (`illustrations/motifs.tsx`) ; une seule animation, jouée une fois, aucune
  si le visiteur a demandé moins de mouvement.

**Un en-tête ne doit jamais contredire ce qu'il coiffe** : les compteurs se
calculent sur ce qui est réellement affiché, filtre compris.

### Hero du tableau de bord — `BlocBrief` + `HeroEtablissement` (2026-10-25)

Le tableau de bord n'a pas l'en-tête des autres pages : c'est le seul écran qui
résume tout le dossier, et son hero le dit autrement.

- **Fond** : `.fond-pointille` (bleu pâle piqué d'une trame de points, « table
  à dessin ») à la place du bleu ciel. Ce qui se lit dessus pose sa surface
  blanche. Sous le hero, le fond du board est blanc.
- **Le titre** du brief, sous la date, est masqué — sauf pour les lecteurs
  d'écran — quand des échéances sont dépassées : les compteurs sont aux
  widgets. Aucun relevé chiffré dans le hero.
- **La fiche de l'établissement**, pleine largeur : monogramme, nom, activité
  et adresse ; régime, effectif, équipe, équipements ; les zones, en
  information — le filtre de zone est ailleurs, sur la rangée de
  « Personnaliser ».
- **Le bâtiment**, dans sa propre carte à côté de la fiche, contenu sans
  recadrage : le genre de lieu (`illustrationBatiment` : type ERP, puis secteur
  du code NAF, puis local générique). La carte recevra une vraie photo.
- **Le guide de mise en place** n'a plus de bloc à lui : tant qu'il reste des
  étapes, la fiche porte « Informations incomplètes » et, sous les cartes à
  droite, « Finir de compléter les infos de l'établissement » ouvre les étapes
  dans un `PanneauModal`.
- **La photo du lieu**, déposée par le dirigeant, remplace l'illustration dans
  sa carte (« Ajouter une photo », « Changer », « Retirer »).
- **Interdit** : rien n'est épinglé sur le dessin. Un plan du lieu, puis une
  étiquette par zone, ont été essayés et refusés : un emplacement dessiné se
  lit comme celui du client, que le produit ne connaît pas.

**Les cartes du tableau de bord sont coiffées de leur section** (2026-10-25) :
une bande à la teinte de la section du rail (`TEINTE_SECTION`), avec son nom,
en tête de `CarteBoard`. Un widget ne choisit pas sa couleur : il déclare la
page dont il est l'extrait (`WidgetDefinition.page`), et la section se déduit
de `categorieDeItem`. Le sur-titre bleu « famille » de `TitreBloc` est retiré.
Hors du tableau de bord, `CarteBoard` n'a pas de coiffe.

**Deux motifs réutilisables**, retenus par la propriétaire :

1. **`.fond-pointille`** — un fond, jamais une carte.
2. **L'étiquette épinglée** — tige d'encre fine depuis un point noir, gélule
   blanche cerclée d'encre, rond à la couleur d'état (chiffre, ✓ ou –), libellé
   court. À poser sur un objet générique dont l'étiquette dit vrai (un
   appareil, une pièce de dossier), jamais sur un dessin qui passerait pour le
   lieu du client. Pas d'emploi aujourd'hui.

### Fiche — modèle : `app/etablissements/[id]/registre/[sectionId]/page.tsx`

```
<EcranFiche provenance={…} canonique={…}>
  <CorpsFiche principal={<><CarteFiche …/>…</>} cote={<CarteFiche titre="Et ensuite">…</CarteFiche>} />
</EcranFiche>
```

Avec bandeau bord à bord quand la fiche ouvre un chapitre plutôt qu'elle ne
prolonge une ligne — modèle : `equipements/[equipementId]/page.tsx`.

### Formulaire

`useActionState` + server action + Zod **côté serveur**. Le type d'état :

```ts
| { status: "idle" }
| { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
| { status: "success"; id: string }
```

~~`react-hook-form` et `zodResolver` sont dans `package.json` mais **utilisés
nulle part**.~~ [2026-10-14 : retirés de `package.json` (audit Next.js, B7).]
Ne pas les introduire.

Champs en `.label-board` / `.champ-board`. **L'erreur de validation est en
`text-[12.5px]` `--board-signal-ink`**, pas `text-destructive`.

Détails de saisie : date → `type="date"` ; nombre → `type="text"
inputMode="numeric"` (la molette d'un champ nombre modifie une valeur déjà
saisie par accident) ; `aria-describedby` chaîne l'aide et l'erreur.

---

## 6. L'état vide

Il n'y a pas de composant unique. `EmptyState` existe mais porte la charte
papier.

Le motif board, en trois cas distincts :

1. **Vraiment vide** — une carte board qui dit ce que l'écran fera quand il y
   aura des données, **d'où elles viendront**, et donne une porte.
2. **Filtré** — un registre plus léger, `rounded-[22px]` sur
   `--board-slate-pale`, « Rien ne correspond à ces filtres » + « Retirer les
   filtres ».
3. **Sous-ensemble vide dans une liste pleine** — une seule phrase, pas une page
   d'accueil.

**Vide ≠ filtré.** Envoyer « déclarez vos équipements » à quelqu'un qui vient de
le faire lui fait chercher une erreur de saisie qui n'existe pas.

On n'écrit jamais « Aucun résultat ». Jamais d'icône d'alerte. Un état vide ne
doit pas ressembler à une erreur.

Corollaire : **un emplacement vide se pose quand même.** Un emplacement qui
n'apparaît qu'une fois rempli ne se remplit jamais — personne ne devine qu'on
peut joindre la plaque signalétique d'un extincteur si rien ne le dit. L'état
vide est le plus important des deux : il énonce ce qu'on attend, et pourquoi.

---

## 7. Les interdits, et leur raison

Chacun vient d'un commentaire du code, souvent écrit après le bug qu'il évite.

### Couleur

1. **Jamais de blanc sur le rose.** L'encre rouge sombre tient 4,7 sur ce champ,
   le noir 9,8, le blanc 2,0.
2. **La couleur dit l'état, jamais le volume.**
3. **Pas de rose là où rien n'a d'échéance.** Une fiche à remplir n'est pas en
   retard.
4. **L'ambre est l'attention, pas l'absence.** « À planifier » porte l'ardoise :
   ce n'est pas une urgence, c'est l'absence de rendez-vous.
5. **`--board-slate` n'est pas une encre** (~1,6:1).
6. **Une seule couleur dans une ligne de champ** : l'encre de retard, et
   seulement si un délai est dépassé.
7. **Ne pas mélanger les deux familles de gris.**

### Icônes

8. **La même icône ne peut pas nommer un objet ici et une action là.**
9. **Rien qui nomme déjà autre chose** ; et l'objet plutôt que le thème — le
   réfrigérateur, pas le flocon ; le manomètre, pas le triangle de danger.
10. **Jamais la couleur seule** : picto + mot (WCAG 2.1 AA). Une signalétique
    qui tient à une icône disparaît en niveaux de gris, à l'impression, et pour
    qui n'y voit pas.

> **Conflit ouvert au 2026-08-27** : `Users` désigne trois choses — les
> Prestataires dans le rail, la famille `personnel` du calendrier, et le type
> `attestation`. Le prochain écran qui en a besoin doit en choisir une autre.
>
> **2026-08-28** — c'est ce qu'a fait le type `titre-salarie`, premier type
> rattaché à la famille `personnel` : il prend `IdCard`, l'icône de « Équipe »
> dans le rail, suivant la règle de l'ADR-016 (« chaque type porte l'icône de
> son module dans le rail »). Le conflit à trois reste ouvert : `Users` désigne
> toujours les Prestataires, la famille `personnel` et le type `attestation`.

### Hiérarchie

11. **Jamais deux niveaux de titrage dans une carte.**
12. **Pas de sur-titre quand le titre nomme déjà la vue.**
13. **La précision ne devient jamais le grand titre.**

### Vérité

14. **Le retard ne remplace jamais le statut, il s'ajoute.** L'écran qui
    n'affichait que « en retard » perdait l'information que personne ne s'en
    était encore saisi.
15. **Le silence ne doit jamais ressembler à une réponse.** Sans mention, un
    appareil muet et un appareil à jour affichent la même chose : rien.
16. **Un fait de saisie, jamais un jugement.** « Renseignée » n'est pas
    « conforme », et aucun libellé ne doit le laisser entendre.
17. **Deux faits, jamais un verdict.** Pas un mot de conformité.

### Interaction

18. **Une phrase d'avertissement s'écrit en clair, jamais en infobulle** — une
    infobulle n'existe pas au doigt.
19. **Pas de lien mort** : mieux vaut une porte annoncée fermée qu'un bouton
    inerte.
20. **Un vrai `<button disabled>`**, pas un `<span aria-disabled>` : sans
    `role`, l'attribut n'est pas exposé.
21. **Une commande qu'on n'atteint qu'en défaisant son défilement n'est pas
    atteignable.**
22. **Respecter `prefers-reduced-motion`.**

### Technique

23. **Ne pas construire un nom de classe Tailwind à la volée** — Tailwind ne le
    voit pas. Table statique.
24. **`overflow-x: clip`, pas `hidden`** : `hidden` fait de l'élément un
    conteneur de défilement et neutralise `position: sticky` à l'intérieur.
25. **Filets et voiles sur le `<li>`, jamais sur le lien** : un lien est
    toujours l'unique enfant de sa ligne, donc `first:` y correspond à chaque
    fois et efface tous les séparateurs.
26. **Ne pas recopier `.carte-board`, `.pastille-board`, `.champ-board`** en
    littéral.

---

## Une checklist, pour finir

1. `bg-[color:var(--board-canvas)]` (le tableau de bord : blanc) et
   `px-[var(--board-gutter)]` — jamais `mx-auto max-w-*`.
2. Rythme vertical : `gap-[22px]` en fiche, `gap-7` en liste.
3. Cartes : `.carte-board` + `px-7 py-6 sm:px-8`.
4. Pastilles : `.pastille-board` + un ton de `PastilleFiche`.
5. Couleurs d'état : `CHAMP_ETAT` / `ENCRE_ETAT`, jamais un couple inventé.
6. Formulaires : `.label-board` / `.champ-board`, erreurs en
   `--board-signal-ink`.
7. Réutiliser le kit avant d'écrire un composant.
8. État vide : dire d'où viendront les données, et distinguer vide de filtré.

---

## Ce que ce document ne fait pas

Il ne remplace pas les commentaires du code, qui portent le détail et
l'historique — pourquoi le canvas a changé de teinte, pourquoi le `Restrict`
d'une contrainte, pourquoi telle icône a été écartée. Il en est l'index.

Il ne décrit pas la page publique (`.lp-*`), qui partage les couleurs et les
cartes mais pas le reste.

Et il ne dit pas comment migrer les écrans restés en charte papier. C'est un
chantier, pas une règle.
