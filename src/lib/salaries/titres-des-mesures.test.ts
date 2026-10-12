// La table mesure → titre (`titres-des-mesures.ts`). Pas de liste recopiée :
// une borne basse (les deux mesures qui ont motivé le lot) et des propriétés
// sur chaque ligne, quelle qu'en soit la longueur demain.

import { describe, expect, it } from "vitest";
import { tousRisquesConnus } from "@/lib/referentiels";
import { cataloguerTitres } from "./catalogue";
import { TITRE_DE_LA_MESURE, titreAppeleParLaMesure } from "./titres-des-mesures";

const LIGNES = Object.entries(TITRE_DE_LA_MESURE);

function mesuresDuReferentielDuerp(): Set<string> {
  const ids = new Set<string>();
  for (const r of tousRisquesConnus().values()) {
    for (const m of r.mesuresRecommandees) ids.add(m.id);
  }
  return ids;
}

describe("TITRE_DE_LA_MESURE", () => {
  it("chaque cible est un titre que le catalogue propose (ni retiré, ni au niveau audit)", () => {
    const catalogue = new Set(cataloguerTitres().map((t) => t.id));
    expect(LIGNES.filter(([, c]) => !catalogue.has(c.titre))).toEqual([]);
  });

  it("chaque clé est une mesure du référentiel DUERP", () => {
    const mesures = mesuresDuReferentielDuerp();
    expect(LIGNES.map(([id]) => id).filter((id) => !mesures.has(id))).toEqual([]);
  });

  it("chaque ligne porte un motif qui cite un article", () => {
    // « Une phrase » ne se teste pas — « R. 4544-10 » contient un point suivi
    // d'une espace. Ce qui se teste : le motif existe et nomme son article.
    expect(LIGNES.filter(([, c]) => !/\b[LRD]\. \d{4}-\d/.test(c.motif))).toEqual([]);
  });

  it("borne basse : l'habilitation électrique et la formation à la conduite sont reliées", () => {
    expect(titreAppeleParLaMesure("trv-elec-habilitation")?.id).toBe(
      "elec-salarie-habilitation",
    );
    expect(titreAppeleParLaMesure("trv-engins-formation")?.id).toBe(
      "conduite-salarie-formation",
    );
  });

  it("une mesure personnalisée ou sans correspondance n'appelle rien", () => {
    expect(titreAppeleParLaMesure(null)).toBeUndefined();
    expect(titreAppeleParLaMesure("trv-elec-carnet")).toBeUndefined();
  });
});
