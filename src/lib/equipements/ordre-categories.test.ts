import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES_EQUIPEMENT } from "@/lib/referentiels/types-communs";
import { ordreCategorie, trierParCategorie } from "./labels";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORDRE DES CATÉGORIES N'A QU'UNE SOURCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT (2026-09-04). Quatre requêtes triaient par
 * `orderBy: { categorie: "asc" }`. Sur une colonne d'énumération, PostgreSQL
 * trie dans l'ordre de l'ENUM, pas dans l'ordre alphabétique ni dans celui du
 * code. Or la migration du 2026-08-25 avait ajouté `RIA` par un `ADD VALUE`
 * sans `BEFORE 'AUTRE'` : en base, il venait DERNIER. Les robinets d'incendie
 * armés s'affichaient donc après « Autre équipement » dans le parc, dans le
 * registre de sécurité et dans le serveur MCP, quand le code les place en
 * troisième position. Dix jours sans que rien ne le signale.
 *
 * DEUX RAISONS POUR LESQUELLES PERSONNE NE POUVAIT LE VOIR. `orderBy:
 * { categorie: "asc" }` se lit comme un tri par catégorie — et c'en est un,
 * dans un ordre qui vit ailleurs. Et deux commentaires de migration affirment
 * que « l'ordre de l'enum gouverne l'ordre d'affichage du sélecteur », ce qui
 * est faux : le sélecteur parcourt `CATEGORIES_EQUIPEMENT`. La croyance était
 * plausible, elle envoyait chercher le symptôme au mauvais endroit.
 *
 * CE QUE CETTE GARDE TIENT, ET CE QU'ELLE NE TIENT PAS. Elle n'aligne pas deux
 * copies — elle refuse qu'il y en ait deux. Aucune requête ne délègue plus
 * l'ordre des catégories à la base ; l'ordre de l'enum PostgreSQL est donc
 * devenu sans effet, et `RIA` peut y rester en dernier sans conséquence. Une
 * migration de réalignement aurait corrigé cette valeur-là et laissé la
 * suivante se désaligner en silence.
 */

const RACINE = process.cwd();

/** Les sources de `src/lib` — là où vivent les requêtes. */
function sources(dossier: string): string[] {
  const trouves: string[] = [];
  const descendre = (d: string) => {
    for (const entree of readdirSync(d)) {
      const p = join(d, entree);
      if (statSync(p).isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) trouves.push(p);
    }
  };
  descendre(join(RACINE, dossier));
  return trouves;
}

/** Le texte d'un fichier, ses commentaires retirés — sinon la garde compte ses
 *  propres explications et se rassure toute seule. */
function codeNu(chemin: string): string {
  return readFileSync(chemin, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("l'ordre des catégories ne se délègue pas à la base", () => {
  it("aucune requête ne trie sur la colonne `categorie`", () => {
    const fautifs: string[] = [];
    for (const fichier of [...sources("src/lib"), ...sources("src/app")]) {
      const code = codeNu(fichier);
      // `orderBy` accepte un objet ou un tableau : on cherche la clé triée,
      // quelle que soit la forme qui l'enveloppe.
      if (/\bcategorie\s*:\s*"(asc|desc)"/.test(code)) {
        fautifs.push(fichier.slice(RACINE.length + 1));
      }
    }
    expect(
      fautifs,
      "Sur une colonne d'énumération, PostgreSQL trie dans l'ordre de l'ENUM, " +
        "qui n'est pas celui de `CATEGORIES_EQUIPEMENT` — c'est ainsi que les " +
        "RIA se sont retrouvés après « Autre équipement » pendant dix jours. " +
        "Lire sans ce tri, puis appeler `trierParCategorie`.",
    ).toEqual([]);
  });

  it("`ordreCategorie` rend la position de la liste, et rien d'autre", () => {
    // Dérivé, jamais recopié : la liste est la seule source de l'ordre.
    CATEGORIES_EQUIPEMENT.forEach((c, i) => {
      expect(ordreCategorie(c), c).toBe(i);
    });
  });

  it("le tri est stable — le second critère reste celui de la requête", () => {
    // La propriété qui compte vraiment : les requêtes ont abandonné leur tri
    // par catégorie, PAS leur tri par date ou par libellé. Si `sort` ne
    // conservait pas l'ordre d'entrée à catégorie égale, ce second critère
    // disparaîtrait sans que rien ne le dise.
    const derniere = CATEGORIES_EQUIPEMENT[CATEGORIES_EQUIPEMENT.length - 1];
    const premiere = CATEGORIES_EQUIPEMENT[0];
    const entree = [
      { id: "b", categorie: derniere },
      { id: "c", categorie: premiere },
      { id: "a", categorie: derniere },
      { id: "d", categorie: premiere },
    ];
    expect(trierParCategorie(entree).map((e) => e.id)).toEqual([
      "c",
      "d",
      "b",
      "a",
    ]);
  });

  it("ne modifie pas la liste qu'on lui donne", () => {
    const entree = [
      { id: "x", categorie: CATEGORIES_EQUIPEMENT[3] },
      { id: "y", categorie: CATEGORIES_EQUIPEMENT[1] },
    ];
    const copie = [...entree];
    trierParCategorie(entree);
    expect(entree).toEqual(copie);
  });
});
