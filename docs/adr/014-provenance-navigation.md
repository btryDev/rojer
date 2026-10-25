# ADR-014 — Le retour dit d'où l'on vient, le fil d'Ariane dit où la fiche vit

> **Amendement du 2026-10-25 (décision de la propriétaire, lot
> `lot/entete-ilot`).** Les pages d'entrée du rail n'ont plus de fil
> d'Ariane : elles s'ouvrent sur l'en-tête commun (`EnTetePage`), et ce sont
> la marque du rail et la gélule de compte qui mènent à l'établissement. Le
> composant `FilAriane` et `AppTopbar` sont supprimés. **La moitié « retour »
> de cette décision est intacte** : une fiche dit d'où l'on vient par
> `FilRetour` et la provenance (`src/lib/navigation/provenance.ts`), jamais
> par un lien écrit en dur. Les mentions d'`AppTopbar` et du fil d'Ariane
> ci-dessous décrivent l'état d'avant cet amendement. La garde vit désormais
> dans `src/components/entete-page/pages-d-entree.test.tsx`.

- Statut : acceptée
- Date : 2026-08-20
- Portée : `src/lib/navigation/`, `src/components/ui-kit/FilRetour.tsx`,
  `src/components/navigation/LienProvenance.tsx`, `AppTopbar`, les pages de
  détail d'établissement
- Dépend de : ADR-010 (registre d'échéances du calendrier)

## Contexte

Une fiche de Rojer n'a pas une porte, elle en a cinq. Une action corrective
s'ouvre depuis le plan d'actions, depuis le calendrier — qui la range parmi
ses échéances —, depuis la vérification dont elle lève l'écart, depuis le
brief du tableau de bord, depuis un widget. Une vérification s'ouvre depuis
le calendrier, le registre de sécurité, une action, quatre widgets. C'est
voulu : le dirigeant n'a pas à savoir dans quel module une chose est rangée
pour la trouver.

Chaque page de détail portait pourtant un **lien de retour écrit en dur**
vers son parent d'arborescence : « ← Plan d'actions » sur une action,
« ← Calendrier » sur une vérification, « ← Annuaire » sur un prestataire.
Le dirigeant qui ouvrait une action depuis le calendrier était donc éjecté
dans le plan d'actions — un écran qu'il n'avait pas demandé, où il devait
se réorienter, et depuis lequel il ne retrouvait pas sa place dans le
calendrier. Le lien de retour ne mentait pas sur sa destination : il
mentait sur ce qu'un lien de retour est censé faire.

Le problème est aggravé par l'état d'écran. Le calendrier porte une lecture
(par mois / par équipement), un filtre de famille, un filtre de domaine, un
filtre d'urgence ; le plan d'actions porte une origine et un mode audit ;
le registre porte un domaine et une recherche. Ce travail de cadrage était
perdu à chaque aller-retour.

## Décision

Séparer deux questions que le lien de retour confondait :

- **Où cette fiche vit-elle ?** — c'est l'arborescence. Elle ne change
  jamais : une action appartient au plan d'actions, une vérification au
  calendrier. Elle reste offerte, en fil d'Ariane (`AppTopbar`) ou en lien
  secondaire (`FilRetour`).
- **D'où est-ce que j'arrive ?** — c'est la **provenance**. Elle change à
  chaque visite, et c'est elle que « ← » doit suivre.

La provenance voyage dans l'URL, sous un paramètre `?de=` qui porte le
chemin **et la query** de l'écran d'origine :

```
/etablissements/{id}/actions/{actionId}?de=%2Fetablissements%2F{id}%2Fcalendrier%3Fvue%3Dequipement
```

`src/lib/navigation/provenance.ts` est le seul endroit qui la pose
(`avecProvenance`, `origineDepuis`) et la relit (`lireProvenance`). Le nom
de l'écran d'origine n'est jamais transporté : il est **déduit du chemin**,
via `deduireActif` et la table `LABEL_ITEM` de la sidebar. La navigation et
le fil de retour nomment donc un écran de la même façon, par construction.

Trois règles bornent le mécanisme :

1. **Un seul saut.** `origineDepuis` retire le `de` entrant avant de le
   réémettre. Une fiche atteinte depuis le calendrier ne réexpédie pas le
   calendrier dans ses propres liens, elle s'annonce elle-même. Au-delà
   d'un saut, c'est le bouton « précédent » du navigateur qui fait son
   métier — l'URL n'a pas à devenir un historique.
2. **Rien qui sorte du dossier.** `lireProvenance` rejette tout ce qui
   n'est pas un chemin interne sous `/etablissements/{id}` : URL absolue,
   protocol-relative, antislash, autre établissement. Un `de` forgé ne peut
   servir ni de tremplin vers l'extérieur, ni de passerelle entre dossiers.
3. **Aucun texte libre affiché.** Les libellés viennent d'une table fermée.
   Faire porter au paramètre l'intitulé du retour aurait affiché, sous les
   traits du produit, un texte contrôlé par l'appelant.

## Pourquoi l'URL et non un état client

`document.referrer` et `router.back()` savent où revenir mais pas **comment
s'appelle** l'écran d'où l'on vient : ils ne peuvent donc pas l'écrire. Un
état en mémoire ou en `sessionStorage` ne survit ni au rafraîchissement, ni
au partage d'un lien, ni au rendu serveur — le fil de retour clignoterait.
L'URL, elle, rend le fil correct au premier octet, reproductible et
partageable. C'est la même doctrine que le reste du produit : ce qui décrit
l'état d'un écran vit dans l'URL, pas à côté.

## Deux façons de poser un lien, pour une seule raison

- Un écran **entièrement rendu au serveur** connaît son chemin et ses
  paramètres : il appelle `origineDepuis` puis `avecProvenance` lui-même
  (plan d'actions, registre, fiches de détail).
- Un écran dont une partie de l'état **ne repasse pas par le serveur**
  utilise `<LienProvenance>`. Le cas est réel : le calendrier écrit sa
  lecture (`?vue=equipement`) d'un `history.replaceState`, sans navigation.
  Un lien fabriqué au serveur ignorerait cette lecture, et le retour
  ramènerait sur une autre vue que celle quittée. Côté client,
  `usePathname` / `useSearchParams` voient l'URL réelle au moment du clic.

## Conséquences

- Une action ouverte depuis le calendrier affiche « ← Calendrier · Plan
  d'actions » et revient dans la lecture et les filtres du moment. Ouverte
  depuis le plan d'actions, elle affiche un seul lien — le doublon est
  supprimé par `retourDistinct` — mais conserve les filtres de la liste.
- La suppression d'une fiche renvoie là d'où l'on venait, pas au parent
  canonique : la fiche n'existe plus, l'écran d'origine si.
- Le surlignage du rail reste gouverné par l'arborescence
  (`deduireActif`) : il dit où la chose est rangée, jamais par où l'on est
  passé. Une vérification ouverte depuis le registre surligne « Calendrier »
  et propose « ← Registre de sécurité ». Les deux affirmations sont vraies
  et disent des choses différentes.
- Toute nouvelle page de détail doit lire `de` et rendre un `FilRetour`
  (ou passer `retour` à `AppTopbar`) plutôt qu'écrire son retour en dur.

## Alternatives écartées

- **Réécrire le fil d'Ariane selon la provenance** (« Établissement ›
  Calendrier › PF-001 »). Rejeté : le fil d'Ariane dit une hiérarchie ; la
  faire dépendre du chemin parcouru en ferait un historique déguisé, et un
  permis de feu ne vit pas dans le calendrier.
- **Ne garder que le bouton « précédent » du navigateur.** Rejeté : il
  n'est pas visible dans l'écran, ne se nomme pas, et ne dit pas au
  dirigeant qu'il peut aussi aller voir le plan d'actions.
- **Un référentiel de « parents contextuels » en dur** (si l'on vient de X,
  retourner à Y). Rejeté : autant de cas que de couples d'écrans, et rien
  ne restitue l'état de l'écran quitté.
