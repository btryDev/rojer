// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { EtablissementForm } from "./EtablissementForm";
import { etablissementSchema } from "@/lib/etablissements/schema";

// DF 10 § 3, 2026-10-12 (décision de la propriétaire du 2026-10-08) : la
// présence d'un SSI de catégorie A ou B se demande une fois, sur la fiche,
// aux seuls ERP des quatre premières catégories — et « Je ne sais pas
// encore » reste offert, le silence retenant la ligne « à confirmer ».

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const entreprise = { id: "ent", effectif: 10 };

function fiche(categorieErp: string) {
  return render(
    <EtablissementForm
      action={action}
      libelleSubmit="Enregistrer"
      entreprise={entreprise}
      valeursInitiales={{
        raisonDisplay: "Magasin",
        estEtablissementTravail: true,
        estERP: true,
        typeErp: "M",
        typesErpAutres: [],
        categorieErp,
        ssiCategorieAouB: false,
      }}
    />,
  );
}

describe("fiche établissement : la question du SSI A ou B (DF 10 § 3)", () => {
  it("posée en N1 à N4, avec la réponse déjà donnée et « Je ne sais pas encore »", () => {
    const { container } = fiche("N2");
    const select = container.querySelector<HTMLSelectElement>('select[name="ssiCategorieAouB"]');
    expect(select).not.toBeNull();
    expect(select!.value).toBe("non");
    expect(select!.required).toBe(false);
    expect([...select!.options].map((o) => o.value)).toEqual(["", "oui", "non"]);
  });

  it("absente en 5ᵉ catégorie, et elle suit la catégorie choisie", () => {
    const { container } = fiche("N5");
    expect(container.querySelector('select[name="ssiCategorieAouB"]')).toBeNull();
    fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="categorieErp"]')!, {
      target: { value: "N3" },
    });
    expect(container.querySelector('select[name="ssiCategorieAouB"]')).not.toBeNull();
  });

  it("le schéma lit trois états : vide = pas répondu, jamais « non » ; non posté = rien n'est écrit", () => {
    const base = {
      raisonDisplay: "Magasin",
      adresse: "1 rue",
      effectifSurSite: 10,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp: "M",
      categorieErp: "N2",
      personnesPresentesHabituellement: 400,
    };
    const lu = (v: unknown) => {
      const r = etablissementSchema.safeParse(v === undefined ? base : { ...base, ssiCategorieAouB: v });
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
      return r.success ? r.data.ssiCategorieAouB : "échec";
    };
    expect(lu("oui")).toBe(true);
    expect(lu("non")).toBe(false);
    expect(lu("")).toBeNull();
    expect(lu(undefined)).toBeUndefined();
  });
});
