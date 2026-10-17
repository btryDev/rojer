// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@/lib/onboarding/actions", () => ({ finaliserOnboarding: async () => ({ status: "idle" as const }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/lib/auth/actions", () => ({ signOutAction: async () => {} }));

import { VALEURS_INITIALES, type OnboardingState } from "./types";
import { validerTypologie } from "./validation";
import { ChampsCaches } from "./WizardShell";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { saisieOnboardingDepuisFormData } from "@/lib/onboarding/saisie";
import { questionSommeilPosee } from "@/lib/etablissements/schema";

// Le filtre à l'accueil (2026-10-17) : le client (refus à l'étape) et le
// serveur rendent le même verdict sur la même saisie. ~~Le harnais fixait
// `estERP: true` en dur et construisait la saisie serveur à la main~~ (revue
// du même jour, C4) : il passe désormais par les champs cachés du vrai
// parcours (`ChampsCaches`), puis par la lecture de la server action
// (`saisieOnboardingDepuisFormData`), puis par `onboardingSchema`.

afterEach(cleanup);

const CHAMPS_FILTRE = ["typeErp", "typesErpAutres", "accueilEnfants"];

type Cas = { erp?: boolean; typeErp: string; autres?: string[]; enfants?: "" | "oui" | "non" };
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
  // Hors ERP : « Non » vide le type (comme l'écran) ; une réponse restée en
  // mémoire ne compte pas, et n'est pas postée.
  { erp: false, typeErp: "", enfants: "oui" },
];

function etat(c: Cas): OnboardingState {
  const erp = c.erp ?? true;
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
    estERP: erp,
    estIGH: false,
    estHabitation: false,
    typeErp: c.typeErp,
    typesErpAutres: c.autres ?? [],
    categorieErp: erp ? "N5" : "",
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
  const { container } = render(<form><ChampsCaches state={s} /></form>);
  const fd = new FormData(container.querySelector("form")!);
  cleanup();
  const r = onboardingSchema.safeParse(saisieOnboardingDepuisFormData(fd));
  return r.success ? [] : Object.keys(r.error.flatten().fieldErrors).filter((k) => CHAMPS_FILTRE.includes(k));
}

describe("filtre à l'accueil — le client et le serveur disent la même chose, par les champs du vrai parcours", () => {
  it.each(CAS)("%j", (c) => {
    const s = etat(c);
    const client = verdictClient(s);
    const serveur = verdictServeur(s);
    if (client === null) expect(serveur).toEqual([]);
    else expect(serveur).toContain(client);
  });

  it("borne basse : les refus attendus sont vus des deux côtés", () => {
    expect(verdictClient(etat({ typeErp: "J" }))).toBe("typeErp");
    expect(verdictServeur(etat({ typeErp: "J" }))).toEqual(["typeErp"]);
    expect(verdictServeur(etat({ typeErp: "N", autres: ["U"] }))).toEqual(["typesErpAutres"]);
    expect(verdictClient(etat({ typeErp: "R", enfants: "oui" }))).toBe("accueilEnfants");
    expect(verdictServeur(etat({ typeErp: "R", enfants: "oui" }))).toEqual(["accueilEnfants"]);
    expect(verdictServeur(etat({ typeErp: "R", enfants: "non" }))).toEqual([]);
    expect(verdictServeur(etat({ erp: false, typeErp: "", enfants: "oui" }))).toEqual([]);
  });
});

describe("ChampsCaches — la réponse n'est postée que si R est déclaré (revue du 2026-10-17, C4)", () => {
  const poste = (s: OnboardingState) => {
    const { container } = render(<form><ChampsCaches state={s} /></form>);
    const v = new FormData(container.querySelector("form")!).get("accueilEnfants");
    cleanup();
    return v;
  };

  it("R avec une réponse : postée", () => {
    expect(poste(etat({ typeErp: "R", enfants: "non" }))).toBe("non");
  });

  it("une réponse restée en mémoire sans R : rien n'est posté", () => {
    expect(poste({ ...etat({ typeErp: "N" }), accueilEnfants: "non" })).toBeNull();
    expect(poste({ ...etat({ erp: false, typeErp: "" }), typeErp: "R", accueilEnfants: "oui" })).toBeNull();
  });
});
