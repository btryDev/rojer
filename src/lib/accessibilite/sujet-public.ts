// Ce qu'une surface publique du registre d'accessibilité nomme de sa propre
// autorité — et qu'elle ne devrait pas.
//
// POURQUOI CE MODULE EXISTE. `identite.ts` décide que le sujet de la page est
// l'établissement. Rien n'obligeait les surfaces à lui demander : chacune
// lisait `registre.etablissement.entreprise` dans son coin et composait son
// en-tête à la main. Les deux l'ont composé faux, et pendant des mois — le
// titre portait l'entreprise, le pied de page son SIRET.
//
// Une garde qui vérifierait le rendu ne suffirait pas : elle dirait que CES
// deux fichiers-là sont justes aujourd'hui. Ce qu'on veut tenir est plus
// fort — **aucune surface publique de ce module ne décide seule de qui elle
// parle** — et cela se vérifie sur la source, pour les fichiers d'aujourd'hui
// comme pour ceux que personne n'a encore écrits.
//
// LE PÉRIMÈTRE EST DES RÉPERTOIRES, PAS DES FICHIERS. Une troisième surface
// publique déposée dans l'un d'eux entre dans le balayage sans que personne
// ait à penser à l'y inscrire — c'est le seul mode sous lequel une liste ne se
// périme pas. Et que ces répertoires soient bien PUBLICS n'est pas affirmé
// ici : `sujet-public.test.ts` le demande à `cheminPublic`, la règle même du
// proxy, plutôt que de recopier `PUBLIC_PREFIXES`.
//
// LES COMMENTAIRES SONT EXCLUS, comme dans `corpus/citations-ecran.ts` et pour
// la même raison : un commentaire qui parle de l'entreprise raconte une
// décision — celui de `page.tsx` explique précisément pourquoi le SIRET est
// parti —, et le visiteur ne le lit pas. L'état de bloc est suivi d'une ligne
// à l'autre : la première version de l'autre module ne regardait que la
// première ligne d'un `/* … */`, et se contredisait.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Les répertoires servis sans session — cf. `CHEMINS_PUBLICS` de
 * `src/lib/supabase/middleware.ts`, restreints au module accessibilité.
 */
export const SURFACES_PUBLIQUES_ACCESSIBILITE = [
  "src/app/accessibilite",
  "src/app/api/accessibilite",
] as const;

/**
 * Les noms par lesquels une surface désignerait l'entreprise de sa propre
 * autorité. `entreprise` couvre l'accès et la clé de `select` Prisma ;
 * `raisonSociale` et `siret` couvrent le cas où la donnée aurait été
 * déstructurée ou passée sous un autre nom en chemin.
 */
const MOTIF_ENTREPRISE = /\b(entreprise|raisonSociale|siret)\b/i;

export type EmpruntEntreprise = {
  /** `chemin:ligne`, relatif à la racine du dépôt. */
  emplacement: string;
  /** La ligne fautive, resserrée. */
  ligne: string;
};

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
 * Les endroits où une surface publique du registre nomme l'entreprise
 * elle-même, au lieu de recevoir son sujet d'`identitePublique`.
 *
 * Rend une liste vide quand la règle tient. `racine` est la racine du dépôt —
 * le test lui passe un bac à sable pour vérifier que le balayage voit
 * réellement un défaut qu'on lui injecte.
 */
export function surfacesQuiNommentLEntreprise(
  racine: string,
): EmpruntEntreprise[] {
  const emprunts: EmpruntEntreprise[] = [];

  for (const dossier of SURFACES_PUBLIQUES_ACCESSIBILITE) {
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

        if (!MOTIF_ENTREPRISE.test(ligne)) return;

        emprunts.push({
          emplacement: `${fichier.slice(racine.length + 1)}:${index + 1}`,
          ligne: nue.slice(0, 120),
        });
      });
    }
  }

  return emprunts;
}
