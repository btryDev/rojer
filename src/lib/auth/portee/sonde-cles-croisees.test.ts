// La sonde des clés croisées, sans base : ce qu'elle couvre, et que la section
// de `scripts/sante-base.sql` est à jour. Son exécution sur un vrai
// PostgreSQL est éprouvée dans `client.integration.test.ts` (lien croisé posé
// puis trouvé).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CLES_STOCKEES } from "@/lib/suppression/cles-stockees";
import { CORRESPONDANCE, IDENTITES_SCALAIRES, type Classement } from "./correspondance";
import { CLES_SANS_RELATION, PAS_UNE_CLE_DE_COMPTE, remplacerSection, requetesSonde } from "./sonde-cles-croisees";

const classement = (nom: string): Classement | undefined => (CORRESPONDANCE as Record<string, Classement>)[nom];
const duCompte = (nom: string) => {
  const c = classement(nom);
  return c !== undefined && ("racine" in c || "parent" in c);
};
const MODELES = Prisma.dmmf.datamodel.models;
const liens = requetesSonde().map((r) => r.lien);

describe("sonde des clés croisées : ce qu'elle couvre", () => {
  it("chaque clé étrangère entre deux modèles d'un compte a sa requête, sauf la relation au parent", () => {
    // Recompté ici depuis le schéma brut (`Prisma.dmmf`), quand la sonde lit
    // les relations du client borné (`relations`, `borne.ts`) : deux sources,
    // qui doivent dire la même chose.
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

  it("borne basse : des liens connus, d'une racine comme d'un rattachement lointain, et une clé de fichier", () => {
    for (const l of [
      "Equipement.batiment → Batiment",
      "Action.risque → Risque",
      "DemandeAssistance.etablissement → Etablissement",
      "RapportVerification.fichierCle → FichierStocke",
    ])
      expect(liens).toContain(l);
  });

  it("chaque clé de stockage du schéma est sondée (CLES_STOCKEES, tenue complète par suppression/fichiers.test.ts)", () => {
    const attendues = Object.entries(CLES_STOCKEES).flatMap(([m, cs]) => cs.map((c) => `${m}.${c} → FichierStocke`));
    expect(attendues.filter((l) => !liens.includes(l))).toEqual([]);
  });

  it("le niveau établissement : seulement là où les deux côtés en ont un", () => {
    expect(liens).toContain("Verification.equipement → Equipement (établissement)");
    // Une racine de compte n'a pas d'établissement par son chemin : pas de requête.
    expect(liens).not.toContain("DemandeAssistance.etablissement → Etablissement (établissement)");
    expect(liens.filter((l) => l.endsWith("FichierStocke (établissement)"))).toEqual([]);
  });

  it("aucune requête vers l'identité ni vers un modèle hors compte", () => {
    const cibles = liens.map((l) => l.split(" → ")[1].replace(/ \(établissement\)$/, ""));
    expect(cibles.filter((c) => !duCompte(c))).toEqual([]);
  });

  it("chaque identifiant sans relation d'un modèle de compte est classé : sondé, borné comme identité, ou écarté avec son motif", () => {
    const sondes = new Set(CLES_SANS_RELATION.map((c) => `${c.modele}.${c.cle}`));
    // Une identité scalaire (`IDENTITES_SCALAIRES`) est bornée par le client : hors de la sonde, classée par sa table.
    for (const [m, cles] of Object.entries(IDENTITES_SCALAIRES)) for (const c of cles ?? []) sondes.add(`${m}.${c}`);
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
    const parSignature = CLES_SANS_RELATION.find((c) => c.modele === "Signature")!.cibles;
    expect(Object.keys(parSignature).sort()).toEqual([...signable].sort());
  });
});

describe("scripts/sante-base.sql", () => {
  const texte = readFileSync(join(process.cwd(), "scripts/sante-base.sql"), "utf8");

  it("porte la section générée, à jour du schéma (sinon : scripts/sonde-cles-croisees.ts)", () => {
    expect(remplacerSection(texte)).toBe(texte);
  });

  it("la section est dans la transaction en lecture seule", () => {
    const debut = texte.indexOf("-- SONDE:DEBUT");
    expect(texte.indexOf("BEGIN TRANSACTION READ ONLY")).toBeLessThan(debut);
    expect(texte.indexOf("-- SONDE:FIN")).toBeLessThan(texte.lastIndexOf("ROLLBACK"));
  });
});
