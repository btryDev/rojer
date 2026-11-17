// @vitest-environment jsdom
/**
 * Les gestes des cartes de la page Formules (2026-11-17) : s'abonner dit le
 * montant prélevé aujourd'hui avant le clic et reste fermé sans prix ;
 * changer de formule dit son effet, et une baisse qui laisserait trop
 * d'utilisateurs est refusée avant le clic (ADR-053 §§ 9, 10 et 14).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/abonnements/actions", () => ({
  sAbonnerAction: vi.fn(),
  changerFormuleAction: vi.fn(),
  annulerBaisseAction: vi.fn(),
}));

const { GesteChangement, GesteSAbonner } = await import("./GestesDeFormule");

afterEach(cleanup);

const formuleEnvoyee = (c: HTMLElement) => (c.querySelector('input[name="formule"]') as HTMLInputElement).value;

describe("GesteSAbonner", () => {
  it("envoie la formule et le rythme de la carte, et dit le montant du jour TTC", () => {
    const { container } = render(
      <GesteSAbonner cle="rojer_pro_annuel" libelle="Pro" centimes={89_900} periodicite="annuel" compteId="c1" carte="encre" />,
    );
    expect(formuleEnvoyee(container)).toBe("rojer_pro_annuel");
    expect(screen.getByText(/Prélevé aujourd.hui : 899\s€ TTC, pour la première année/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "S'abonner à Pro" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("pendant l'essai : sa formule gratuite jusqu'à la fin, s'y abonner plus tôt en geste discret ; une autre formule ; l'essai s'arrête et c'est prélevé aujourd'hui (2026-11-17)", () => {
    const fin = new Date("2026-12-16T12:00:00Z");
    render(
      <>
        <GesteSAbonner cle="rojer_essentiel_mensuel" libelle="Essentiel" centimes={2_900} periodicite="mensuel" compteId="c1" carte="claire" essai={{ fin, sienne: true, proche: false }} />
        <GesteSAbonner cle="rojer_pro_mensuel" libelle="Pro" centimes={7_900} periodicite="mensuel" compteId="c1" carte="encre" essai={{ fin, sienne: false, proche: false }} />
      </>,
    );
    const plusTot = screen.getByRole("button", { name: "M'abonner dès maintenant" });
    // Un lien, pas le bouton plein de la carte : rien n'y pousse.
    expect(plusTot.className).not.toMatch(/lp-btn/);
    expect(screen.getByRole("button", { name: "Passer à Pro" }).className).toMatch(/lp-btn/);
    expect(screen.getByText("Votre formule, gratuite jusqu'au 16 décembre 2026.")).toBeTruthy();
    expect(screen.getAllByText(/^Prélevé aujourd.hui : .* Dès l'abonnement, les limites de l'essai sont levées, et les documents officiels s'ouvrent \(valider, exporter, publier, faire signer\) ; votre essai s'arrête\.$/)).toHaveLength(2);
  });

  it("dans la dernière semaine de l'essai : s'abonner à sa formule redevient le geste plein", () => {
    render(
      <GesteSAbonner
        cle="rojer_essentiel_mensuel"
        libelle="Essentiel"
        centimes={2_900}
        periodicite="mensuel"
        compteId="c1"
        carte="claire"
        essai={{ fin: new Date("2026-12-16T12:00:00Z"), sienne: true, proche: true }}
      />,
    );
    expect(screen.getByRole("button", { name: "M'abonner à Essentiel" }).className).toMatch(/lp-btn/);
  });

  it("prix indisponible : le bouton reste fermé", () => {
    render(<GesteSAbonner cle="rojer_essentiel_mensuel" libelle="Essentiel" centimes={null} periodicite="mensuel" compteId="c1" carte="claire" />);
    expect((screen.getByRole("button", { name: "S'abonner à Essentiel" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("GesteChangement", () => {
  const option = {
    cle: "rojer_essentiel_mensuel",
    libelle: "Essentiel",
    sens: "baisse" as const,
    effet: "À la fin de votre période payée.",
    prixConnu: true,
    depassements: [],
  };

  it("une montée tout de suite : son effet, puis « Passer à … »", () => {
    render(<GesteChangement option={{ ...option, cle: "rojer_pro_mensuel", libelle: "Pro", sens: "montee", effet: "Tout de suite." }} compteId="c1" carte="encre" />);
    expect(screen.getByText("Tout de suite.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Passer à Pro" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("une baisse avec trop d'utilisateurs : refusée avant le clic, et le bouton le dit", () => {
    render(
      <GesteChangement
        option={{ ...option, depassements: [{ quota: "membres", utilise: 2, plafond: 1 }] }}
        compteId="c1"
        carte="claire"
      />,
    );
    const bouton = screen.getByRole("button", { name: "Prévoir ce changement" }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute("aria-describedby")).toBe("refus-rojer_essentiel_mensuel");
    expect(screen.getByText(/Retirez d.abord 1 utilisateur/)).toBeTruthy();
  });

  it("ce qui dépasserait d'autre passe en lecture seule, dit avant le clic", () => {
    render(
      <GesteChangement
        option={{ ...option, depassements: [{ quota: "etablissements", utilise: 3, plafond: 1 }] }}
        compteId="c1"
        carte="claire"
      />,
    );
    expect(screen.getByText(/Passeraient en lecture seule.*2 établissements, les plus récents/)).toBeTruthy();
  });
});
