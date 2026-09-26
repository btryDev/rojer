import { describe, expect, it } from "vitest";
import { permisFeuSchema } from "./schema";

const base = {
  prestataireRaison: "Frigo Service",
  prestataireContact: "M. Dupont",
  prestataireEmail: "contact@exemple.fr",
  donneurOrdreNom: "Mme Martin",
  dateDebut: "2026-10-01T08:00",
  dateFin: "2026-10-01T12:00",
  lieu: "Cuisine, chambre froide",
  naturesTravaux: ["brasage"],
  descriptionTravaux: "Brasage des liaisons frigorifiques.",
  mesuresValidees: ["eloignement-combustibles-10m"],
  dureeSurveillanceMinutes: "120",
};

const erreurs = (v: object) => {
  const r = permisFeuSchema.safeParse(v);
  return r.success ? {} : r.error.flatten().fieldErrors;
};

describe("la création d'un permis de feu (contre-lecture du 2026-09-26)", () => {
  it("accepte la liste courante et une durée proposée par l'écran", () => {
    expect(erreurs(base)).toEqual({});
  });

  it("refuse un identifiant retiré — un formulaire ouvert avant le changement de liste", () => {
    expect(erreurs({ ...base, mesuresValidees: ["zone-degagee-5m"] })).toHaveProperty("mesuresValidees");
  });

  it("refuse trente minutes de surveillance, que « 2 h au moins » cochée laissait passer", () => {
    expect(erreurs({ ...base, dureeSurveillanceMinutes: "30" })).toHaveProperty("dureeSurveillanceMinutes");
  });
});
