# Note de rédaction — écrire et concevoir la com de Rojer

*Brouillon, 2026-11-05. Document de travail, non servi par l'app, non publié.
But : poser ce qui doit transparaître dans toute page, mail, vidéo ou argumentaire,
pour ne pas réécrire le positionnement à chaque fois. Le texte public qui fait
foi reste la landing (`src/app/page.tsx`, `src/components/landing/`) ; cette note
dit avec quelle intention l'écrire.*

---

## 1. Ce qu'on vend, en une phrase

> **Concentrez-vous sur votre activité, Rojer coordonne la prévention des risques
> de votre structure.**

Un **copilote prévention** pour le dirigeant de TPE/PME non expert. Pas un
générateur de documents : un outil qui coordonne la conformité **toute l'année**,
et dont les documents (DUERP, registres, dossier de contrôle) sont des *sorties*,
pas la raison d'être.

La cible : le dirigeant qui n'a **pas de service QHSE**, qui n'a pas le temps, et
qui ne doit pas avoir à savoir quel seuil le concerne. Rojer prémâche à partir de
ce qu'il déclare (effectif, régimes, catégorie ERP, équipements) — jamais à
partir d'une moyenne d'utilisateurs.

## 2. Les deux axes qui nous distinguent

### Axe 1 — La rigueur se voit, et se vérifie

C'est notre différence la plus forte **et la moins visible de l'extérieur**. Le
travail de com consiste à la rendre tangible. Formulation de référence :

> **Chaque obligation est une ligne du référentiel. Elle porte :**
> - **son article**, cité ligne par ligne, et visible dans l'appli ;
> - **ses conditions** : l'équipement déclaré, mais aussi le régime (lieu de
>   travail ou ERP), le type et la catégorie d'ERP, les locaux à sommeil,
>   l'effectif ;
> - **qui doit la faire** : l'exploitant, une personne qualifiée ou un
>   organisme agréé ;
> - **l'origine de son rythme** : écrit dans le texte, donné par une norme, ou
>   « 1 fois par an (choix de Rojer) » quand le texte est vague. Un rythme par
>   défaut est présenté comme tel, jamais comme une fréquence officielle.

**L'exemple qui rend ça concret** (à réutiliser en démo, vidéo, argumentaire) :
une **alarme incendie** ne donne pas le même suivi partout.
- Dans un bureau sans public (R. 4224-17) : entretien et vérification, sans
  rythme écrit → Rojer retient 1 fois par an **et dit que c'est son choix**.
- Dans un ERP de 1ʳᵉ à 4ᵉ catégorie (MS 69) : en plus, un contrôle
  **hebdomadaire** par l'exploitant.

Une table « alarme → 1 an » se trompe dans un des deux cas. Rojer tranche sur la
donnée déclarée. Même logique pour le défibrillateur (dû seulement en catégories
1 à 4, donc jamais demandé à un commerce de 5ᵉ).

> **Angle d'attaque frontal contre les concurrents** : « Une fréquence sans
> source ni condition ne se vérifie pas. Si elle est fausse, vous ne le saurez
> qu'au contrôle. » Nos lignes, un préventeur ou un inspecteur peut les relire.

### Axe 2 — L'humain : le rendez-vous avec un expert

Le logiciel ne reste pas seul. Les offres Pro et Sur mesure donnent accès à un
**expert en sécurité de BTRY Solution** : conseil technique de prévention,
**jamais** d'avis juridique, **jamais** « vous êtes conforme ». C'est le levier
de montée en gamme et ce qui nous sort de la guerre des prix.

- Pro : **1 h de rendez-vous par an** sur tout le dossier (≈ la valeur d'une
  mise à jour de DUERP chez un consultant, ~400 €).
- Sur mesure : expert à la demande, reprise d'historique, déploiement accompagné.

Cadre à tenir dans les CGV : conseil technique, pas consultation juridique (loi
du 31 décembre 1971). Voir
[`benchmark-offres-abonnement-2026-11.md`](benchmark-offres-abonnement-2026-11.md) § 3.

## 3. Le zéro-IA, argument opposable

Toute la valeur vient de trois choses déterministes : qualité du référentiel
(sources primaires Légifrance/INRS), design du questionnaire, règles métier. Pas
de LLM pour traiter les réponses. **Presque tous les concurrents vendent de l'IA**
(DUERP.ai, Deemply AI…) ; notre « zéro-IA » devient un argument : auditabilité,
reproductibilité sur un document à valeur légale, RGPD simple, pas de dérive.

## 4. Les mots qu'on n'écrit pas (règle dure)

Une garde de code (`src/lib/rendu/sans-qualification.test.ts`, sur `main`) refuse
déjà ces formes dans l'app. **Toute com écrite hors code suit les mêmes règles.**
Interdits, et pourquoi :

- **« conforme », « en règle », « en infraction », « opposable », « valeur
  légale », « score de conformité »** → l'outil assiste, il ne certifie jamais.
  La conformité se constate sur pièces, par une personne habilitée.
- **« prêt pour le contrôle », « rien à préparer »** → se tenir prêt est un
  entretien continu, pas un état livré par construction.
- **Toute promesse de rappel ou d'envoi automatique** (« un e-mail vous
  prévient avant la date », « créé automatiquement », « se pose tout seul ») →
  **pas encore livré.** Les relances email n'existent pas aujourd'hui (seuls les
  mails de connexion/accès partent). Ne pas le promettre avant de le construire
  (cf. la promesse retirée de la landing le 2026-09-26, `docs/backlog.md` § 2).
- **Dire que les contrôles « arrivent tout seuls »** → faux, il faut déclarer
  les dates (rejet explicite dans le ton des vidéos).

## 5. Ce qu'on ne promet pas encore (sinon on ment)

Aligné sur les offres (marqué « bientôt ») et la dette produit :
- **Relances email** des échéances.
- **Multi-utilisateur** (rôles) — en conception.
- **Téléchargement/export** des données du titulaire après résiliation — dette
  ouverte (`docs/dette-chantier-porteur-echeance.md` § 1.1).
- **Application mobile** et **rappels SMS** — ne jamais les promettre.
- L'envoi réel d'une demande d'assistance (ADR-050 : enregistrée, ne part pas
  encore).

## 6. Périmètre — ce qu'on peut dire sans se tromper

La base de toute phrase sur la couverture est
`docs/couverture-declaree-du-produit.md` (sur `main`).
- **Évaluation DUERP** : restauration, commerce de détail, bureau/tertiaire.
- **Suivi des vérifications** : découle des équipements et de l'établissement
  déclarés (Code du travail + dispositions ERP lues).
- **La cible** : jusqu'à 49 salariés, pas d'ERP en IGH. Tous les types d'ERP sont
  acceptés à l'onboarding ; ce qui n'est pas suivi pour un type se **déclare**
  (page « Ce que Rojer ne couvre pas »). On **refuse ce qu'on ne sait pas
  servir, pas ce qu'on ne couvre pas entièrement**.
- Hors périmètre à dire franchement : ICPE, ATEX, amiante/plomb/radon/CMR, sites
  industriels, piscines, IGH. Déclarés, non refusés.

Ne jamais vendre un secteur ou un module qu'on couvre en surface : c'est là que
le concurrent se trompe, pas un terrain à l'imiter.

## 7. Direction visuelle (rappel, détail ailleurs)

- Illustrations **2.5D trait fin, aplats clairs, une couleur d'accent, fond
  pastel par famille** (esprit Sumsub / Artea). Rejeté : 3D clay, pixel art, flat
  « banque d'images ». Mémoire projet « direction illustration ».
- Vidéos : **grand public, clean mais dynamique**, vraie UI seulement, rien
  d'inventé sans le dire. Gabarit `scripts/visites/`. Mémoire « ton des vidéos ».
- Charte de l'app : `docs/charte-board.md` (board, pas papier).

## 8. Comparatifs — à utiliser, avec prudence

Le benchmark (dix éditeurs) est dans
[`benchmark-offres-abonnement-2026-11.md`](benchmark-offres-abonnement-2026-11.md).
Les fiches concurrents vivent dans [`concurrents/`](concurrents/).
- **Deemply** : outil de préventeur (service QHSE), pas notre cible. Ne pas se
  battre sur le nombre de modules. Rapport : https://claude.ai/artifact/B1K84XPvWc9i81HmHn7cR4
- **DUERP & GO** : commercial soigné, droit approximatif.
  [`concurrents/duerp-go-2026-11-05.md`](concurrents/duerp-go-2026-11-05.md).

Règle : dans un comparatif public, **ne jamais nommer les erreurs d'un
concurrent** (risque juridique et de ton). On affirme notre rigueur ; on ne
dénonce pas la leur.

---

## Questions ouvertes (pour la propriétaire)

1. **Prix** : la gamme 29 / 69 € / sur mesure est une proposition, pas une
   décision. Arrêter avant toute com publique.
2. **Exemple de dossier public** sans compte, comme leur PDF d'exemple — on le
   fait ? (fort pour la rigueur, faible coût).
3. **Prix affichés** sur la landing — on bascule du « contactez-nous » vers des
   prix visibles ?
4. **Ordre de priorité** des promesses « bientôt » à livrer avant de les écrire
   (relances email en tête ?).
