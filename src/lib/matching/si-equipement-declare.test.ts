import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";
import {
  empreinteReferentiel,
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import type { Obligation } from "@/lib/referentiels/conformite/types";

/**
 * `siEquipementDeclare` (2026-10-08, C64) : une obligation d'ÉTABLISSEMENT qui
 * n'existe que si au moins un équipement de la catégorie est déclaré, et qui
 * produit alors UNE ligne — pas une par équipement. Le cas qui l'a fait
 * naître : la formation au risque chimique, portée jusque-là par chaque
 * stockage déclaré.
 */
const ID = "stockage-dangereux-etablissement-formation-personnel";

const ETAB: EtablissementMatching = {
  id: "etab",
  effectifSurSite: 6,
  effectifEntreprise: 6,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: null,
};

const stockage = (id: string): EquipementMatching => ({
  id,
  libelle: `Armoire ${id}`,
  categorie: "STOCKAGE_MATIERE_DANGEREUSE",
  caracteristiques: null,
});

const lignes = (equipements: EquipementMatching[]) =>
  determineObligationsApplicables(ETAB, equipements).filter((a) => a.obligation.id === ID);

describe("siEquipementDeclare — une ligne d'établissement, née d'une catégorie déclarée", () => {
  it("aucun stockage déclaré : la formation n'existe pas", () => {
    expect(lignes([])).toHaveLength(0);
  });

  it("trois stockages déclarés : UNE ligne, portée par l'établissement", () => {
    const l = lignes([stockage("a"), stockage("b"), stockage("c")]);
    expect(l).toHaveLength(1);
    expect(l[0].porteur).toBe("etablissement");
    expect(l[0].equipementsConcernes).toEqual([]);
  });

  it("un équipement d'une autre catégorie ne la fait pas naître", () => {
    expect(
      lignes([{ id: "x", libelle: "Extincteur", categorie: "EXTINCTEUR", caracteristiques: null }]),
    ).toHaveLength(0);
  });

  it("la formation garde le défaut annuel, pris dans un texte de portée générale (L. 4141-2)", () => {
    const o = obligationParId(ID)!;
    expect(o.rythmeRetenu?.periodicite).toBe("annuelle");
    expect(o.referencesLegales.map((r) => r.article)).toContain("L. 4141-2");
  });

  it("une obligation d'établissement SANS le champ reste due sans aucun équipement (ADR-022)", () => {
    const sans = obligationsConformite.filter(
      (o) => o.porteur === "etablissement" && !o.siEquipementDeclare,
    );
    expect(sans.length).toBeGreaterThan(0);
    const ids = new Set(determineObligationsApplicables(ETAB, []).map((a) => a.obligation.id));
    expect(ids.has("incendie-registre-securite") || ids.has("formation-securite-etablissement-organisation")).toBe(true);
  });

  it("le champ entre dans l'empreinte : il décide de l'existence d'une ligne", () => {
    const o = obligationParId(ID)! as Obligation;
    const { siEquipementDeclare: _s, ...sans } = o as Obligation & { siEquipementDeclare?: unknown };
    void _s;
    expect(empreinteReferentiel([o])).not.toBe(empreinteReferentiel([sans as Obligation]));
  });
});
