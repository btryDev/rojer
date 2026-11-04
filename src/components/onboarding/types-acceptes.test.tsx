// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";

vi.mock("@/lib/onboarding/actions", () => ({ finaliserOnboarding: async () => ({ status: "idle" as const }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/lib/auth/actions", () => ({ signOutAction: async () => {} }));

import { VALEURS_INITIALES, type OnboardingState } from "./types";
import { validerTypologie } from "./validation";
import { ChampsCaches } from "./WizardShell";
import { StepTypologie } from "./StepTypologie";
import { EtablissementForm } from "@/components/etablissements/EtablissementForm";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { saisieOnboardingDepuisFormData } from "@/lib/onboarding/saisie";
import { questionSommeilPosee } from "@/lib/etablissements/schema";
import { TYPES_ERP } from "@/lib/referentiels/types-communs";

// RÉALIGNEMENT (2026-11-03, ADR-031 amendée) : le filtre à l'accueil du
// 2026-10-17 est levé. Aucun type d'ERP ne se refuse plus — ni J, ni U, ni
// les établissements spéciaux, ni R qui accueille des enfants : ce que Rojer
// ne suit pas se déclare (`perimetre/couverture.ts`, axe `type_erp`).
// Remplace `filtre-accueil-coherence`, `step-typologie-filtre` et
// `fiche-filtre`, qui tenaient le filtre.
//
// La saisie passe par le vrai parcours : les champs cachés (`ChampsCaches`),
// la lecture de la server action, puis `onboardingSchema`.

afterEach(cleanup);

function etat(typeErp: string, autres: string[] = []): OnboardingState {
  const s: OnboardingState = {
    ...VALEURS_INITIALES,
    raisonSociale: "X",
    siret: "12002701600357",
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
    typeErp,
    typesErpAutres: autres,
    categorieErp: "N5",
    personnesPresentesHabituellement: "30",
  };
  return questionSommeilPosee(s) ? { ...s, comporteLocauxSommeilPublic: "non" } : s;
}

function erreursServeur(s: OnboardingState): string[] {
  const { container } = render(<form><ChampsCaches state={s} /></form>);
  const fd = new FormData(container.querySelector("form")!);
  cleanup();
  const r = onboardingSchema.safeParse(saisieOnboardingDepuisFormData(fd));
  return r.success ? [] : Object.keys(r.error.flatten().fieldErrors);
}

describe("réalignement — tout type d'ERP de GN 1 est accepté, au client comme au serveur", () => {
  it.each([...TYPES_ERP])("type principal %s", (t) => {
    const s = etat(t);
    expect(validerTypologie(s)).toBeNull();
    expect(erreursServeur(s)).toEqual([]);
  });

  it.each([...TYPES_ERP].filter((t) => t !== "N"))("autre type %s à côté d'un restaurant", (t) => {
    const s = etat("N", [t]);
    expect(validerTypologie(s)).toBeNull();
    expect(erreursServeur(s)).toEqual([]);
  });
});

describe("réalignement — la question de l'accueil d'enfants n'existe plus", () => {
  function Hote({ initial }: { initial: Partial<OnboardingState> }) {
    const [state, setState] = useState<OnboardingState>({ ...VALEURS_INITIALES, estERP: true, categorieErp: "N3", ...initial });
    return <StepTypologie state={state} update={(p) => setState((s) => ({ ...s, ...p }))} errors={{}} blocage={null} entreprisesConnues={[]} />;
  }

  it("au parcours, ni au type R, ni en autre type R", () => {
    expect(render(<Hote initial={{ typeErp: "R" }} />).container.textContent).not.toMatch(/enfants/i);
    cleanup();
    expect(render(<Hote initial={{ typeErp: "N", typesErpAutres: ["R"] }} />).container.textContent).not.toMatch(/enfants/i);
  });

  it("sur la fiche, quand R entre", () => {
    const { container } = render(
      <EtablissementForm
        action={async () => ({ status: "idle" as const })}
        libelleSubmit="Enregistrer"
        entreprise={{ id: "ent", effectif: 10 }}
        valeursInitiales={{ raisonDisplay: "É", estEtablissementTravail: true, estERP: true, typeErp: "N", typesErpAutres: [], categorieErp: "N5" }}
      />,
    );
    fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="typeErp"]')!, { target: { value: "R" } });
    expect(container.querySelector('[name="accueilEnfants"]')).toBeNull();
    expect(container.textContent).not.toMatch(/enfants/i);
  });
});
