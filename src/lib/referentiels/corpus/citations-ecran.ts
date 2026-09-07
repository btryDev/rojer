// Ce que les écrans citent, et que le corpus ne connaît pas.
//
// POURQUOI CE MODULE EXISTE. Le corpus garantit qu'aucune OBLIGATION ne
// s'appuie sur un texte non dépouillé — `corpus.test.ts` le tient à zéro. Mais
// une obligation n'est pas la seule chose qui cite du droit au dirigeant : les
// écrans, les PDF et les exports en citent aussi, en prose, hors du mécanisme.
// Et là, rien ne vérifiait rien.
//
// Trois cas constatés le 2026-09-02, chacun sur une surface que l'utilisateur
// voit :
//
//  - `R. 4121-2` — la mise à jour du DUERP, affichée avec son seuil d'effectif
//    sur l'écran de synthèse. Personne n'a ouvert l'article.
//  - `R. 4512-7` — le plan de prévention, affiché avec un EXTRAIT entre
//    guillemets. Aucun `R. 4512-*` n'est au corpus : le verbatim montré au
//    dirigeant ne vient d'aucun relevé.
//  - `R. 4323-99` — les vérifications périodiques des EPI, en documents
//    obligatoires, sur la même mécanique d'habilitation par arrêté que
//    `R. 4323-23` — que le dépôt a instruite, elle.
//
// CE QUE CE MODULE NE DIT PAS. Qu'une citation soit fausse. Elle est
// probablement juste : ces articles sont connus, et la prose qui les entoure a
// été écrite par quelqu'un qui savait de quoi il parlait. Ce module dit
// seulement que **rien dans le dépôt ne le prouve** — pas de version constatée,
// pas de verbatim, pas de date de lecture. C'est la différence entre une
// affirmation et un fondement, et c'est la seule chose que le corpus mesure.
//
// LE PÉRIMÈTRE DU BALAYAGE est celui des surfaces qui s'affichent : les écrans,
// les composants, les documents générés. Pas `referentiels/` lui-même, dont les
// citations passent déjà par `ReferenceLegale` et sont rapprochées du corpus
// par ailleurs — les mesurer ici les compterait deux fois, avec deux règles
// différentes.
//
// LES COMMENTAIRES SONT EXCLUS, et c'est délibéré. Un commentaire qui cite un
// article raconte une décision — souvent une correction, comme ceux de
// `code-travail-secours.ts` qui expliquent pourquoi un `grep` sur `R. 4224-15`
// rend des résultats trompeurs. Le dirigeant ne les lit pas.
//
// LA PREMIÈRE VERSION N'ÉCARTAIT QUE LES LIGNES QUI COMMENCENT PAR UN MARQUEUR,
// et c'était faux dès le premier jour. `permis-feu/page.tsx` porte un
// `{/* … */}` de quatre lignes qui raconte une correction d'URL du 2026-08-28 ;
// sa DEUXIÈME ligne cite `R. 4434-9`, et le balayage l'a compté comme une
// citation faite au dirigeant. Un lot de dépouillement l'a relevé le jour même :
// le module se contredisait, disant exclure les commentaires et n'excluant que
// leur première ligne. L'état de bloc est désormais suivi d'une ligne à
// l'autre.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CORPUS } from "./index";

/** Les répertoires dont le contenu atteint l'utilisateur. */
export const SURFACES_AFFICHEES = [
  "src/app",
  "src/components",
  "src/lib/pdf",
] as const;

/**
 * Un article du droit français cité en clair : `R. 4121-2`, `L. 4711-5`,
 * `D. 8222-5`, et les formes à deux tirets comme `R. 4121-1-1`.
 *
 * TROIS CHIFFRES AUSSI, ET C'EST LE MOTIF QUI A DÛ CHANGER (2026-09-04). Il
 * n'en admettait que quatre. Or le code de la construction numérote sur trois
 * — `R. 143-2`, `R. 164-6`, `L. 164-1` —, et le code de l'environnement de
 * même. Tout ce que ces deux codes fondent était donc HORS DE PORTÉE du
 * balayage depuis le premier jour : le registre public d'accessibilité, le
 * registre de sécurité en ERP et en IGH, les ascenseurs, les équipements sous
 * pression. Pas une exception écrite quelque part — un angle mort, que
 * personne ne pouvait voir puisque le compteur affichait zéro.
 */
const MOTIF_ARTICLE = /\b[LRD]\.\s?\d{3,4}-\d+(?:-\d+)*\b/g;

const normaliser = (ref: string) => ref.replace(/\s+/g, " ").trim();

/**
 * Toutes les clés d'article que le corpus déclare avoir dépouillées.
 *
 * DEUX VOCABULAIRES QUI NE SE RENCONTRAIENT PAS (2026-09-04). Un corpus nomme
 * souvent son article avec le code devant — `CCH R. 143-44`,
 * `C. env. R. 557-14-1` — quand l'écran écrit `R. 143-44`. La comparaison se
 * faisait sur la chaîne entière : **dix-neuf articles réellement dépouillés
 * étaient invisibles**, et le jour où le motif s'est élargi aux numérotations à
 * trois chiffres, la garde a accusé d'être « jamais ouverts » des textes lus,
 * datés et cités verbatim dans ce même dépôt.
 *
 * C'est le pire défaut possible pour un cliquet posé à zéro : il ne laisse pas
 * passer une faute, il en invente. Et le remède évident — lister les préfixes
 * connus — serait la liste écrite à la main que ce dépôt s'interdit ; elle
 * manquerait le vingtième code.
 *
 * La clé se DÉRIVE donc du même motif des deux côtés : la référence entière est
 * retenue, et tout article qu'elle contient l'est aussi.
 */
export function articlesDuCorpus(): Set<string> {
  const cles = new Set<string>();
  for (const corpus of CORPUS) {
    for (const article of corpus.articles) {
      const ref = normaliser(article.ref);
      cles.add(ref);
      for (const trouve of ref.matchAll(MOTIF_ARTICLE)) {
        cles.add(normaliser(trouve[0]));
      }
    }
  }
  return cles;
}

function fichiersSources(racine: string, dossier: string): string[] {
  const chemin = join(racine, dossier);
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) {
        if (entree !== "node_modules") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) {
        trouves.push(p);
      }
    }
  };
  descendre(chemin);
  return trouves;
}

/**
 * La ligne, PRIVÉE de ce qu'elle cite entre guillemets d'un autre texte.
 *
 * POURQUOI (2026-09-04). Un `LegalBadge` porte deux choses de nature
 * différente : `reference`, qui est ce que LE PRODUIT affirme, et `extrait`,
 * qui est le texte de l'article, recopié. Le balayage les comptait pareil.
 *
 * Résultat, sur l'écran du registre d'accessibilité : le verbatim de
 * `R. 164-6` commence par « L'exploitant de tout établissement recevant du
 * public au sens de l'article R. 143-2 élabore le registre public
 * d'accessibilité prévu à l'article L. 164-1 ». Deux articles y sont nommés —
 * par le législateur, dans sa phrase. La garde exigeait qu'on les dépouille,
 * c'est-à-dire qu'on dépouille tout ce que citent les textes qu'on cite, puis
 * tout ce que ceux-là citent. Sans fin, et pour rien : le produit n'affirme
 * rien sur `R. 143-2`, il montre la phrase où il apparaît.
 *
 * CE QUE ÇA N'EXCUSE PAS, et c'est ce qui rend l'exclusion sûre : l'article
 * DONT on montre le verbatim est, lui, annoncé dans `reference` juste à côté —
 * hors guillemets, donc toujours mesuré. Un extrait produit sans son article
 * reste dénoncé. C'est le même partage que pour les commentaires : ce qui
 * n'est pas le produit qui parle ne se compte pas.
 */
export function sansVerbatim(ligne: string): string {
  return ligne.replace(/\bextrait\s*=\s*"[^"]*"/g, " ");
}

export type CitationOrpheline = {
  /** La clé d'article, normalisée. */
  ref: string;
  /** Où elle apparaît, en `chemin:ligne`, relatif à la racine du dépôt. */
  emplacements: string[];
};

/**
 * Les articles cités sur une surface qui s'affiche, et qu'aucun corpus ne
 * déclare avoir ouverts.
 */
export function citationsSansCorpus(racine: string): CitationOrpheline[] {
  const connus = articlesDuCorpus();
  const orphelines = new Map<string, string[]>();

  for (const dossier of SURFACES_AFFICHEES) {
    for (const fichier of fichiersSources(racine, dossier)) {
      const lignes = readFileSync(fichier, "utf8").split("\n");
      let dansBloc = false;
      lignes.forEach((ligne, index) => {
        const nue = ligne.trim();
        const ouvre = ligne.lastIndexOf("/*");
        const ferme = ligne.lastIndexOf("*/");
        const etaitDansBloc = dansBloc;
        if (ouvre !== -1 && ouvre > ferme) dansBloc = true;
        else if (ferme !== -1 && ferme > ouvre) dansBloc = false;

        const commentaire =
          etaitDansBloc ||
          dansBloc ||
          nue.startsWith("//") ||
          nue.startsWith("*") ||
          nue.startsWith("/*");
        if (commentaire) return;

        for (const trouve of sansVerbatim(ligne).matchAll(MOTIF_ARTICLE)) {
          const ref = normaliser(trouve[0]);
          if (connus.has(ref)) continue;
          const ou = `${fichier.slice(racine.length + 1)}:${index + 1}`;
          const deja = orphelines.get(ref);
          if (deja) deja.push(ou);
          else orphelines.set(ref, [ou]);
        }
      });
    }
  }

  return [...orphelines]
    .map(([ref, emplacements]) => ({ ref, emplacements }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
}
