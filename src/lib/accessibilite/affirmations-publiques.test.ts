import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SURFACES_PUBLIQUES_ACCESSIBILITE } from "./sujet-public";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * LA SEULE SURFACE DU PRODUIT QUI AFFIRME À QUELQU'UN SANS MOYEN DE RECOUPER.
 *
 * Le registre public d'accessibilité est lu par une personne handicapée qui
 * décide d'un déplacement. Elle ne peut ni ouvrir le dossier, ni appeler
 * l'exploitant, ni comparer à quoi que ce soit : ce que la page dit, elle le
 * croit. C'est l'exact opposé de toutes les autres surfaces, où le lecteur est
 * le dirigeant lui-même, qui sait ce qu'il a déclaré.
 *
 * LE DÉFAUT CORRIGÉ LE 2026-09-20. Le pied écrivait « Registre tenu
 * CONFORMÉMENT à l'arrêté du 19 avril 2017 », et le corps « Cet établissement
 * EST adapté à ». Or la publication n'exige que DEUX champs
 * (`accessibilite/actions.ts`), là où l'arrêté « énumère neuf pièces à son
 * article 1er » — phrase déjà écrite dans la page elle-même depuis le
 * 2026-09-04, à quinze lignes de l'affirmation qu'elle démentait. Un registre
 * à deux champs s'affichait comme un registre complet et se concluait par une
 * attestation de conformité.
 *
 * CE QUE CETTE GARDE TIENT, ET CE QU'ELLE NE TIENT PAS. Elle ne juge pas la
 * complétude du registre — c'est une décision de produit, pas un fait. Elle
 * tient une propriété plus étroite et vérifiable : **aucune de ces pages ne
 * porte un verbe de conformité à son compte**. Soit la phrase attribue
 * (« déclare », « établi par l'exploitant »), soit elle ne prétend pas.
 *
 * Trois remèdes quand elle tombe, jamais un quatrième : attribuer la phrase,
 * la retirer, ou exiger à la publication ce qu'elle affirme. Excepter le
 * fichier n'en est pas un.
 */

/**
 * Les tournures par lesquelles une page affirmerait une conformité.
 *
 * PAS DE `\b` DEVANT UNE LETTRE ACCENTUÉE. La première rédaction écrivait
 * `/\bétablissement\s+est\s+adapté/` : en JavaScript, `\b` se définit sur
 * `[A-Za-z0-9_]`, dont `é` ne fait pas partie, si bien que le motif ne matchait
 * PAS « Cet établissement est adapté à » — la phrase même pour laquelle la
 * garde a été écrite. Trouvé par la contre-épreuve ci-dessous, pas en relisant.
 */
const VERBES_DE_CONFORMITE = [
  /conform[ée]ment\s+à/i,
  /\best\s+conforme\b/i,
  /établissement\s+est\s+adapté/i,
  /\bsatisfait\s+(?:à|aux)\b/i,
  /\brespecte\s+(?:l['’]|les?\s)/i,
];

/**
 * Ce qui, dans la même phrase, rend l'affirmation attribuée plutôt que
 * assumée. Le produit a le droit de dire qu'un exploitant déclare ; il n'a pas
 * le droit de dire, lui, que l'établissement l'est.
 */
const ATTRIBUE = /déclar|par\s+l['’]exploitant|selon\s+l['’]exploitant/i;

function fichiersSources(dossier: string, racine: string = RACINE): string[] {
  const chemin = join(racine, dossier);
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) trouves.push(p);
    }
  };
  descendre(chemin);
  return trouves;
}

/** Les lignes rendues — commentaires exclus : ce qui n'est pas affiché ne ment
 *  à personne, et les motifs de correction citent forcément l'ancienne
 *  formule. */
function lignesRendues(source: string): { texte: string; n: number }[] {
  const rendues: { texte: string; n: number }[] = [];
  let dansBloc = false;
  source.split("\n").forEach((ligne, i) => {
    const nue = ligne.trim();
    const ouvre = ligne.lastIndexOf("/*");
    const ferme = ligne.lastIndexOf("*/");
    const etait = dansBloc;
    if (ouvre !== -1 && ouvre > ferme) dansBloc = true;
    else if (ferme !== -1 && ferme > ouvre) dansBloc = false;
    if (etait || dansBloc || nue.startsWith("//") || nue.startsWith("*")) return;
    rendues.push({ texte: ligne, n: i + 1 });
  });
  return rendues;
}

/**
 * Les répertoires balayés.
 *
 * `SURFACES_PUBLIQUES_ACCESSIBILITE` ne couvre que ce qui RÉPOND ; il y manque
 * ce qui FOURNIT LES PHRASES. Éprouvé : en mettant « Cet établissement est
 * conforme aux règles d'accessibilité » dans `LABEL_REGIME`
 * (`lib/accessibilite/schema.ts`), la page l'affichait tel quel et la garde
 * restait verte. Un libellé défini ailleurs est affiché ici : il se balaie ici.
 */
const SOURCES_DES_PHRASES = [
  ...SURFACES_PUBLIQUES_ACCESSIBILITE,
  "src/lib/accessibilite",
] as const;

/**
 * Cherche sur le TEXTE ENTIER, pas ligne à ligne.
 *
 * Éprouvé : « Cet établissement est / adapté à » coupé sur deux lignes — la
 * coupure que prettier fait de lui-même dans ce fichier — passait au vert,
 * alors que JSX écrase le retour et rend la phrase d'un seul tenant. Un
 * balayage ligne à ligne mesure la mise en forme, pas ce qui s'affiche.
 *
 * Les espaces sont donc aplatis, et la position rendue en numéro de ligne par
 * comptage des sauts avant la correspondance.
 */
function affirmationsNues(
  racine: string = RACINE,
  dossiers: readonly string[] = SOURCES_DES_PHRASES,
): string[] {
  const fautives: string[] = [];
  for (const dossier of dossiers) {
    for (const fichier of fichiersSources(dossier, racine)) {
      const source = readFileSync(fichier, "utf8");
      const rendu = lignesRendues(source)
        .map(({ texte, n }) => ({ texte, n }))
        .reduce<{ plat: string; index: { fin: number; n: number }[] }>(
          (acc, { texte, n }) => {
            const morceau = `${texte.replace(/\s+/g, " ").trim()} `;
            acc.plat += morceau;
            acc.index.push({ fin: acc.plat.length, n });
            return acc;
          },
          { plat: "", index: [] },
        );

      for (const verbe of VERBES_DE_CONFORMITE) {
        const motif = new RegExp(verbe.source, "gi");
        for (const m of rendu.plat.matchAll(motif)) {
          const debut = m.index ?? 0;
          // La phrase entière autour de la correspondance, pour juger de
          // l'attribution : « déclare » peut précéder le verbe de plusieurs
          // mots, et se trouvait souvent sur la ligne d'avant.
          const contexte = rendu.plat.slice(
            Math.max(0, debut - 160),
            debut + m[0].length + 80,
          );
          if (ATTRIBUE.test(contexte)) continue;
          const n =
            rendu.index.find((i) => i.fin > debut)?.n ?? 0;
          fautives.push(
            `${fichier.slice(racine.length + 1)}:${n} — ${m[0]}`,
          );
        }
      }
    }
  }
  return fautives;
}

describe("le registre public n'affirme rien à son compte", () => {
  it("trouve bien des surfaces — sinon la garde ne prouve rien", () => {
    const n = SURFACES_PUBLIQUES_ACCESSIBILITE.flatMap((d) =>
      fichiersSources(d),
    ).length;
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it("aucune page publique ne porte un verbe de conformité non attribué", () => {
    const fautives = affirmationsNues();
    expect(
      fautives,
      fautives.length === 0
        ? ""
        : `Ces lignes affirment une conformité au nom du produit :\n  ` +
          `${fautives.join("\n  ")}\n` +
          `La publication n'exige que deux champs ; l'arrêté du 19 avril 2017 ` +
          `en énumère neuf. Attribuez la phrase à l'exploitant, retirez-la, ` +
          `ou exigez à la publication ce qu'elle affirme.`,
    ).toEqual([]);
  });

  it("le motif reconnaît bien la tournure qu'il vise", () => {
    // Contre-épreuve. Une garde dont le motif ne matche plus rien passe au
    // vert pour toujours — et celle-ci porte sur des phrases, donc sur ce qui
    // se réécrit le plus facilement.
    expect(
      VERBES_DE_CONFORMITE.some((v) =>
        v.test("Registre tenu conformément à l'arrêté du 19 avril 2017"),
      ),
    ).toBe(true);
    expect(
      VERBES_DE_CONFORMITE.some((v) => v.test("Cet établissement est adapté à")),
    ).toBe(true);
    // Et il laisse passer la forme attribuée, sans quoi la correction elle-même
    // serait dénoncée.
    const attribuee = "L'exploitant déclare cet établissement adapté à";
    expect(
      VERBES_DE_CONFORMITE.some((v) => v.test(attribuee)) &&
        !ATTRIBUE.test(attribuee),
    ).toBe(false);
  });
});
