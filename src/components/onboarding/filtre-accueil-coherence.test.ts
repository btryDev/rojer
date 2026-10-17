import { describe, expect, it } from "vitest";
import { VALEURS_INITIALES, type OnboardingState } from "./types";
import { validerTypologie } from "./validation";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { questionSommeilPosee } from "@/lib/etablissements/schema";

// Le filtre à l'accueil (2026-10-17) : le client (refus à l'étape) et le
// serveur (`onboardingSchema`) rendent le même verdict sur la même saisie.

const CHAMPS_FILTRE = ["typeErp", "typesErpAutres", "accueilEnfants"];

type Cas = { typeErp: string; autres?: string[]; enfants?: "" | "oui" | "non" };
const CAS: Cas[] = [
  { typeErp: "N" },
  { typeErp: "J" },
  { typeErp: "U" },
  { typeErp: "CTS" },
  { typeErp: "PS" },
  { typeErp: "N", autres: ["U"] },
  { typeErp: "N", autres: ["M", "GA"] },
  { typeErp: "R", enfants: "non" },
  { typeErp: "R", enfants: "oui" },
  { typeErp: "R", enfants: "" },
  { typeErp: "N", autres: ["R"], enfants: "oui" },
  { typeErp: "N", autres: ["R"], enfants: "non" },
];

function etat(c: Cas): OnboardingState {
  const s: OnboardingState = {
    ...VALEURS_INITIALES,
    raisonSociale: "X",
    adresseRue: "1 rue",
    adresseCodePostal: "44000",
    adresseVille: "Nantes",
    codeNaf: "56.10A",
    effectifSurSite: "4",
    effectifEntreprise: "4",
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: c.typeErp,
    typesErpAutres: c.autres ?? [],
    categorieErp: "N5",
    personnesPresentesHabituellement: "30",
    accueilEnfants: c.enfants ?? "",
  };
  return questionSommeilPosee(s) ? { ...s, comporteLocauxSommeilPublic: "non" } : s;
}

function verdictClient(s: OnboardingState): string | null {
  const b = validerTypologie(s);
  return b?.champ && CHAMPS_FILTRE.includes(b.champ) ? b.champ : null;
}

function verdictServeur(s: OnboardingState): string[] {
  const r = onboardingSchema.safeParse({
    raisonSociale: s.raisonSociale,
    siret: "",
    adresse: "1 rue, 44000 Nantes",
    codeNaf: s.codeNaf,
    effectifSurSite: s.effectifSurSite,
    effectifEntreprise: s.effectifEntreprise,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: s.typeErp,
    typesErpAutres: s.typesErpAutres,
    categorieErp: s.categorieErp,
    personnesPresentesHabituellement: s.personnesPresentesHabituellement,
    ...(s.comporteLocauxSommeilPublic ? { comporteLocauxSommeilPublic: s.comporteLocauxSommeilPublic } : {}),
    ...(s.accueilEnfants ? { accueilEnfants: s.accueilEnfants } : {}),
  });
  return r.success ? [] : Object.keys(r.error.flatten().fieldErrors).filter((k) => CHAMPS_FILTRE.includes(k));
}

describe("filtre à l'accueil — le client et le serveur disent la même chose", () => {
  it.each(CAS)("%j", (c) => {
    const s = etat(c);
    const client = verdictClient(s);
    const serveur = verdictServeur(s);
    if (client === null) expect(serveur).toEqual([]);
    else expect(serveur).toContain(client);
  });

  it("borne basse : les refus attendus sont vus des deux côtés", () => {
    expect(verdictClient(etat({ typeErp: "J" }))).toBe("typeErp");
    expect(verdictServeur(etat({ typeErp: "N", autres: ["U"] }))).toEqual(["typesErpAutres"]);
    expect(verdictClient(etat({ typeErp: "R", enfants: "oui" }))).toBe("accueilEnfants");
    expect(verdictServeur(etat({ typeErp: "R", enfants: "non" }))).toEqual([]);
  });
});
