// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  MaterielHorsParc,
  MentionPresence,
  SousLEnTetePresence,
  type LigneSecuriteAffichee,
} from "./PresenceObligatoire";

// Ce que la page Équipements pose en tête d'un groupe (ADR-057 § 4) : la
// mention sur la carte de la catégorie dit combien d'appareils sont déclarés,
// jamais qu'ils sont en place ; le matériel sans catégorie garde son geste
// « Déclarer » vers « Ce qui doit être en place ».

afterEach(cleanup);

const commun = {
  fondement: null,
  aConfirmer: false,
  hrefAction: null,
};

const appareil = (id: string) => ({ id, libelle: id, categorie: "DEFIBRILLATEUR" as const });

const dae = (n: number): LigneSecuriteAffichee => ({
  ...commun,
  obligationId: "dae-erp-detention",
  libelle: "Défibrillateur (DAE)",
  cible: { kind: "categorie", categorie: "DEFIBRILLATEUR" },
  etat: n > 0 ? "appareils" : "aucun",
  admetLePartage: true,
  domaine: "secours",
  appareils: Array.from({ length: n }, (_, i) => appareil(`dae-${i}`)),
});

describe("MentionPresence", () => {
  it("dit « obligatoire ici » et le nombre déclaré, sans reprendre le nom de la catégorie", () => {
    render(<MentionPresence ligne={dae(2)} />);
    expect(screen.getByText(/Obligatoire ici · 2 déclarés/)).toBeTruthy();
    expect(screen.queryByText(/Défibrillateur/)).toBeNull();
  });

  it("aucun appareil : « aucun déclaré »", () => {
    render(<MentionPresence ligne={dae(0)} />);
    expect(screen.getByText(/aucun déclaré/)).toBeTruthy();
  });

  it("nomme l'obligation quand elle n'est pas la catégorie (alarme sonore ≠ SSI)", () => {
    render(
      <MentionPresence
        ligne={{
          ...dae(1),
          obligationId: "incendie-travail-alarme-sonore",
          libelle: "Système d'alarme sonore",
          cible: { kind: "categorie", categorie: "ALARME_INCENDIE" },
          domaine: "incendie",
        }}
      />,
    );
    expect(screen.getByText(/Obligatoire ici — système d'alarme sonore · 1 déclaré/)).toBeTruthy();
  });

  it("sous un filtre de zone, le nombre se dit « dans l'établissement »", () => {
    render(<MentionPresence ligne={dae(2)} sousUnFiltre />);
    expect(screen.getByText(/2 déclarés dans l'établissement/)).toBeTruthy();
  });

  it("DAE partagé, ancienne case : chacun son mot", () => {
    render(<MentionPresence ligne={{ ...dae(0), etat: "partage" }} />);
    expect(screen.getByText(/partagé avec un voisin/)).toBeTruthy();
    cleanup();
    render(<MentionPresence ligne={{ ...dae(0), etat: "ancienne_case" }} />);
    expect(screen.getByText(/indiqué en place, aucun appareil déclaré/)).toBeTruthy();
  });

  it("« à confirmer » quand le moteur la retient par prudence", () => {
    render(<MentionPresence ligne={{ ...dae(0), aConfirmer: true }} />);
    expect(screen.getByText(/À confirmer ici/)).toBeTruthy();
  });
});

describe("MaterielHorsParc", () => {
  it("« Déclarer » mène à la ligne de « Ce qui doit être en place »", () => {
    render(
      <MaterielHorsParc
        ligne={{
          ...commun,
          obligationId: "secours-etablissement-materiel",
          libelle: "Matériel de premiers secours",
          cible: { kind: "etat_permanent" },
          etat: "aucun",
          admetLePartage: false,
          domaine: "secours",
          appareils: [],
          hrefAction: "/e/etats-permanents#etat-secours-etablissement-materiel",
        }}
      />,
    );
    const lien = screen.getByRole("link", { name: /Déclarer/ });
    expect(lien.getAttribute("href")).toBe("/e/etats-permanents#etat-secours-etablissement-materiel");
  });
});

describe("SousLEnTetePresence", () => {
  it("le DAE sans appareil propose la case « partagé »", () => {
    render(<SousLEnTetePresence ligne={dae(0)} etablissementId="e" />);
    expect(screen.getByRole("checkbox", { name: /partagé avec un établissement voisin/ })).toBeTruthy();
  });

  it("saisie fermée : la case est désactivée et dit pourquoi ; site gelé : seule la case cochée reste ouverte (décocher = retirer)", () => {
    const motif = "Ce site dépasse votre formule.";
    const caseDae = () => screen.getByRole("checkbox", { name: /partagé avec un établissement voisin/ }) as HTMLInputElement;
    const { rerender } = render(<SousLEnTetePresence ligne={dae(0)} etablissementId="e" fermeture={{ motif, gel: false }} />);
    expect(caseDae().disabled).toBe(true);
    expect(screen.getByText(motif).id).toBe(caseDae().getAttribute("aria-describedby"));

    rerender(<SousLEnTetePresence ligne={{ ...dae(0), etat: "partage" }} etablissementId="e" fermeture={{ motif, gel: false }} />);
    expect(caseDae().disabled).toBe(true);

    rerender(<SousLEnTetePresence ligne={dae(0)} etablissementId="e" fermeture={{ motif, gel: true }} />);
    expect(caseDae().disabled).toBe(true);

    rerender(<SousLEnTetePresence ligne={{ ...dae(0), etat: "partage" }} etablissementId="e" fermeture={{ motif, gel: true }} />);
    expect(caseDae().disabled).toBe(false);
    expect(screen.queryByText(motif)).toBeNull();
  });

  it("le DAE déclaré au parc ne la propose plus", () => {
    const { container } = render(<SousLEnTetePresence ligne={dae(1)} etablissementId="e" />);
    expect(container.textContent).toBe("");
  });

  it("une ancienne case rappelle de déclarer les appareils", () => {
    render(
      <SousLEnTetePresence
        ligne={{
          ...dae(0),
          obligationId: "incendie-travail-extincteurs-dotation",
          libelle: "Extincteurs",
          cible: { kind: "categorie", categorie: "EXTINCTEUR" },
          etat: "ancienne_case",
          admetLePartage: false,
          domaine: "incendie",
        }}
        etablissementId="e"
      />,
    );
    expect(screen.getByText(/Vous aviez indiqué en avoir/)).toBeTruthy();
  });
});
