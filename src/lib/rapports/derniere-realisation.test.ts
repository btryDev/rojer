// La dernière réalisation d'une ligne se lit sur ses rapports (ADR-034).
//
// Trois propriétés que la colonne `dateRealisee` obligeait à maintenir à la
// main, et qui sont vraies ici par construction — chacune a son test, pour que
// la construction ne se défasse pas en silence.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  derniereRealisation,
  indexerDernieresRealisations,
  ORDRE_RAPPORT_PLUS_RECENT,
} from "./derniere-realisation";

const j = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("derniereRealisation", () => {
  it("rend la date du rapport réalisé le plus récent, dans n'importe quel ordre", () => {
    expect(
      derniereRealisation([
        { dateRapport: j("2025-05-01"), resultat: "conforme" },
        { dateRapport: j("2026-06-01"), resultat: "observations_mineures" },
        { dateRapport: j("2024-01-01"), resultat: "ecart_majeur" },
      ]),
    ).toEqual(j("2026-06-01"));
  });

  it("ignore un rapport « non vérifiable » : il n'atteste d'aucun contrôle", () => {
    // Le prestataire s'est déplacé, n'a rien pu vérifier. Plus récent que le
    // dernier contrôle, il ne doit pas le remplacer.
    expect(
      derniereRealisation([
        { dateRapport: j("2025-05-01"), resultat: "conforme" },
        { dateRapport: j("2026-06-01"), resultat: "non_verifiable" },
      ]),
    ).toEqual(j("2025-05-01"));
  });

  it("rend null sans rapport réalisé", () => {
    expect(derniereRealisation([])).toBeNull();
    expect(
      derniereRealisation([{ dateRapport: j("2026-06-01"), resultat: "non_verifiable" }]),
    ).toBeNull();
  });

  it("accepte la liste déjà filtrée d'un select, sans résultat", () => {
    // Un `select` qui filtre en base (le serveur MCP) ne rapporte que la
    // date : l'absence de `resultat` veut dire « déjà réalisé ».
    expect(derniereRealisation([{ dateRapport: j("2026-06-01") }])).toEqual(
      j("2026-06-01"),
    );
  });
});

describe("indexerDernieresRealisations", () => {
  /** Instant de création : sans importance hors du départage du même jour. */
  const cree = new Date("2026-09-01T08:00:00Z");

  it("garde, par ligne, le plus récent", () => {
    const index = indexerDernieresRealisations([
      { verificationId: "v-1", dateRapport: j("2025-05-01"), createdAt: cree },
      { verificationId: "v-2", dateRapport: j("2024-01-01"), createdAt: cree },
      { verificationId: "v-1", dateRapport: j("2026-06-01"), createdAt: cree },
      { verificationId: "v-1", dateRapport: j("2025-12-01"), createdAt: cree },
    ]);
    expect(index.get("v-1")?.dateRapport).toEqual(j("2026-06-01"));
    expect(index.get("v-2")?.dateRapport).toEqual(j("2024-01-01"));
    expect(index.has("v-3")).toBe(false);
  });

  it("garde le RÉSULTAT avec la date : il donne son statut à une obligation ponctuelle", () => {
    const index = indexerDernieresRealisations([
      {
        verificationId: "v-1",
        dateRapport: j("2025-05-01"),
        createdAt: cree,
        resultat: "conforme",
      },
      {
        verificationId: "v-1",
        dateRapport: j("2026-06-01"),
        createdAt: cree,
        resultat: "ecart_majeur",
      },
    ]);
    expect(index.get("v-1")?.resultat).toBe("ecart_majeur");
  });

  it("deux rapports du MÊME JOUR : le dernier déposé l'emporte, quel que soit l'ordre lu", () => {
    // Revue du 2026-09-14. `dateRapport` est un jour civil : deux rapports du
    // même jour portent le même instant. Sans départage, le premier rendu par
    // PostgreSQL gagnait, et le statut d'une ponctuelle — lu sur ce résultat —
    // changeait d'une régénération à l'autre. Les deux ordres doivent donner
    // la même réponse : celle du dépôt le plus tardif.
    const matin = {
      verificationId: "v-1",
      dateRapport: j("2026-06-01"),
      createdAt: new Date("2026-06-01T08:00:00Z"),
      resultat: "conforme",
    };
    const soir = {
      verificationId: "v-1",
      dateRapport: j("2026-06-01"),
      createdAt: new Date("2026-06-01T17:00:00Z"),
      resultat: "ecart_majeur",
    };
    expect(indexerDernieresRealisations([matin, soir]).get("v-1")?.resultat).toBe(
      "ecart_majeur",
    );
    expect(indexerDernieresRealisations([soir, matin]).get("v-1")?.resultat).toBe(
      "ecart_majeur",
    );
  });
});

describe("ORDRE_RAPPORT_PLUS_RECENT — l'ordre des lecteurs est celui du moteur", () => {
  // Huit lecteurs trient les rapports en base par cette constante et lisent
  // le premier ; le moteur départage en mémoire par
  // `indexerDernieresRealisations`. Ce test ne liste pas les lecteurs — une
  // liste recopiée se répare en recopiant — : il tient que la constante,
  // INTERPRÉTÉE comme Prisma l'interprète, désigne le même rapport que le
  // moteur. La borne voisine (aucun tri sur `dateRapport` écrit en littéral
  // hors de ce module) est en fin de fichier.

  type Rapport = {
    verificationId: string;
    dateRapport: Date;
    createdAt: Date;
    resultat: string;
  };

  /** Le tri que Prisma ferait : clé par clé, dans l'ordre du tableau. */
  function trierCommePrisma(rapports: Rapport[]): Rapport[] {
    const criteres = ORDRE_RAPPORT_PLUS_RECENT.flatMap((c) =>
      Object.entries(c) as [keyof Rapport, "asc" | "desc"][],
    );
    return [...rapports].sort((a, b) => {
      for (const [cle, sens] of criteres) {
        const x = (a[cle] as Date).getTime();
        const y = (b[cle] as Date).getTime();
        if (x !== y) return sens === "asc" ? x - y : y - x;
      }
      return 0;
    });
  }

  // Un jeu qui départage : des rapports du même jour déposés dans le
  // désordre, et un rapport déposé APRÈS un autre mais daté AVANT lui — un
  // ordre qui mettrait `createdAt` devant `dateRapport` le choisirait.
  const h = (iso: string) => new Date(iso);
  const JEU: Rapport[] = [
    { verificationId: "v-1", dateRapport: j("2026-06-01"), createdAt: h("2026-06-01T17:00:00Z"), resultat: "ecart_majeur" },
    { verificationId: "v-1", dateRapport: j("2026-06-01"), createdAt: h("2026-06-01T08:00:00Z"), resultat: "conforme" },
    { verificationId: "v-1", dateRapport: j("2026-05-01"), createdAt: h("2026-06-02T09:00:00Z"), resultat: "observations_mineures" },
    { verificationId: "v-2", dateRapport: j("2025-03-10"), createdAt: h("2025-03-10T10:00:00Z"), resultat: "conforme" },
    { verificationId: "v-2", dateRapport: j("2025-03-10"), createdAt: h("2025-03-10T09:00:00Z"), resultat: "ecart_majeur" },
    { verificationId: "v-2", dateRapport: j("2024-03-10"), createdAt: h("2026-01-01T00:00:00Z"), resultat: "observations_mineures" },
  ];

  it("désigne, pour chaque ligne et dans tout ordre d'entrée, le rapport que le moteur retient", () => {
    const ordres = [JEU, [...JEU].reverse(), [JEU[2], JEU[0], JEU[5], JEU[1], JEU[4], JEU[3]]];
    for (const entree of ordres) {
      const moteur = indexerDernieresRealisations(entree);
      for (const id of ["v-1", "v-2"]) {
        const premier = trierCommePrisma(entree.filter((r) => r.verificationId === id))[0];
        expect(
          { dateRapport: premier.dateRapport, resultat: premier.resultat },
          `ligne ${id}`,
        ).toEqual(moteur.get(id));
      }
    }
    // Le jeu départage bien : le moteur retient le dépôt du soir sur v-1 et
    // celui de 10 h sur v-2, pas le premier venu.
    expect(indexerDernieresRealisations(JEU).get("v-1")?.resultat).toBe("ecart_majeur");
    expect(indexerDernieresRealisations(JEU).get("v-2")?.resultat).toBe("conforme");
  });

  it("aucun tri sur `dateRapport` n'est écrit en littéral hors de ce module", () => {
    // La couche voisine : un neuvième lecteur qui recopierait l'ordre, ou un
    // lecteur qui en perdrait le second terme, échappe au test ci-dessus.
    const racine = fileURLToPath(new URL("../..", import.meta.url));
    const fautes: string[] = [];
    let vus = 0;
    const parcourir = (dossier: string): void => {
      for (const e of readdirSync(dossier, { withFileTypes: true })) {
        const complet = join(dossier, e.name);
        if (e.isDirectory()) parcourir(complet);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const rel = relative(racine, complet).split(sep).join("/");
          vus += 1;
          if (rel === "lib/rapports/derniere-realisation.ts") continue;
          if (/dateRapport\s*:\s*["'](asc|desc)["']/.test(readFileSync(complet, "utf8"))) {
            fautes.push(rel);
          }
        }
      }
    };
    parcourir(racine);
    // Le parcours voit bien `src/` : un chemin faux passerait à vide.
    expect(vus).toBeGreaterThan(100);
    expect(
      fautes,
      "Tri de rapports écrit en littéral : utiliser `ORDRE_RAPPORT_PLUS_RECENT` " +
        "(`@/lib/rapports/derniere-realisation`), l'ordre du moteur.",
    ).toEqual([]);
  });
});
