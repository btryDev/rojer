// La sonde des clés croisées, sans base : ce qu'elle couvre, et que la section
// de `scripts/sante-base.sql` est à jour. Son exécution sur un vrai
// PostgreSQL est éprouvée dans `client.integration.test.ts` (lien croisé posé
// puis trouvé).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CORRESPONDANCE, type Classement } from "./correspondance";
import {
  CLES_SANS_RELATION,
  DEBUT_SECTION,
  FIN_SECTION,
  PAS_UNE_CLE_DE_COMPTE,
  requetesSonde,
  sectionSanteBase,
} from "./sonde-cles-croisees";

const classement = (nom: string): Classement | undefined => (CORRESPONDANCE as Record<string, Classement>)[nom];
const duCompte = (nom: string) => {
  const c = classement(nom);
  return c !== undefined && ("racine" in c || "parent" in c);
};
const MODELES = Prisma.dmmf.datamodel.models;
const liens = requetesSonde().map((r) => r.lien);

describe("sonde des clés croisées : ce qu'elle couvre", () => {
  it("chaque clé étrangère entre deux modèles d'un compte a sa requête, sauf la relation au parent", () => {
    // Recompté ici depuis le schéma, sans passer par la sonde.
    const attendus = MODELES.filter((m) => duCompte(m.name)).flatMap((m) => {
      const c = classement(m.name)!;
      return m.fields
        .filter((f) => f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && duCompte(f.type))
        .filter((f) => !("parent" in c && c.parent === f.name))
        .map((f) => `${m.name}.${f.name} → ${f.type}`);
    });
    expect(attendus.length).toBeGreaterThan(10);
    expect(attendus.filter((l) => !liens.includes(l))).toEqual([]);
  });

  it("borne basse : des liens connus, d'une racine comme d'un rattachement lointain", () => {
    for (const l of ["Equipement.batiment → Batiment", "Action.risque → Risque", "DemandeAssistance.etablissement → Etablissement"])
      expect(liens).toContain(l);
  });

  it("aucune requête vers l'identité ni vers un modèle hors compte", () => {
    const cibles = liens.map((l) => l.split(" → ")[1]);
    expect(cibles.filter((c) => !duCompte(c))).toEqual([]);
  });

  it("chaque identifiant sans relation d'un modèle de compte est classé : sondé, ou écarté avec son motif", () => {
    const sondes = new Set(CLES_SANS_RELATION.map((c) => `${c.modele}.${c.cle}`));
    const nonClasses = MODELES.filter((m) => duCompte(m.name)).flatMap((m) => {
      const fk = new Set(m.fields.flatMap((f) => f.relationFromFields ?? []));
      return m.fields
        .filter((f) => f.kind === "scalar" && /Id$/.test(f.name) && !fk.has(f.name))
        .map((f) => `${m.name}.${f.name}`)
        .filter((k) => !sondes.has(k) && !(k in PAS_UNE_CLE_DE_COMPTE));
    });
    expect(nonClasses).toEqual([]);
  });

  it("les listes à la main ne nomment que des champs qui existent encore", () => {
    const existe = (k: string) => {
      const [m, f] = k.split(".");
      return MODELES.some((x) => x.name === m && x.fields.some((y) => y.name === f));
    };
    const morts = [...CLES_SANS_RELATION.map((c) => `${c.modele}.${c.cle}`), ...Object.keys(PAS_UNE_CLE_DE_COMPTE)].filter(
      (k) => !existe(k),
    );
    expect(morts).toEqual([]);
  });

  it("le type d'un objet signé : chaque valeur de l'enum a sa cible", () => {
    const signable = Prisma.dmmf.datamodel.enums.find((e) => e.name === "ObjetSignable")!.values.map((v) => v.name);
    const parSignature = CLES_SANS_RELATION.find((c) => c.modele === "Signature")!.cibles as Record<string, string>;
    expect(Object.keys(parSignature).sort()).toEqual([...signable].sort());
  });
});

describe("scripts/sante-base.sql", () => {
  it("porte la section générée, à jour du schéma (sinon : scripts/sonde-cles-croisees.ts)", () => {
    const texte = readFileSync(join(process.cwd(), "scripts/sante-base.sql"), "utf8");
    const debut = texte.indexOf(DEBUT_SECTION);
    const fin = texte.indexOf(FIN_SECTION);
    expect(debut).toBeGreaterThan(0);
    expect(texte.slice(debut, fin + FIN_SECTION.length)).toBe(sectionSanteBase());
  });

  it("la section est dans la transaction en lecture seule", () => {
    const texte = readFileSync(join(process.cwd(), "scripts/sante-base.sql"), "utf8");
    expect(texte.indexOf("BEGIN TRANSACTION READ ONLY")).toBeLessThan(texte.indexOf(DEBUT_SECTION));
    expect(texte.indexOf(FIN_SECTION)).toBeLessThan(texte.lastIndexOf("ROLLBACK"));
  });
});
