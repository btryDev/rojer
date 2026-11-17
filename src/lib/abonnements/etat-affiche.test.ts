import { describe, expect, it } from "vitest";
import { etatAffiche, type LigneAffichee } from "./etat-affiche";

// L'en-tête de la vue d'ensemble de l'abonnement, phase par phase
// (2026-11-17) : titre, pastille, frise — depuis la seule copie locale.

const MAINTENANT = new Date("2026-11-17T10:00:00Z");
const jour = (iso: string) => new Date(`${iso}T10:00:00Z`);

const ligne = (o: Partial<LigneAffichee>): LigneAffichee => ({
  statut: null,
  formule: null,
  finEssai: null,
  finPeriode: null,
  resilieEnFinDePeriode: false,
  finPrevueLe: null,
  debutPayantLe: null,
  essaiUtiliseLe: null,
  sansAbonnementDepuis: null,
  suppressionPrevueLe: null,
  ...o,
});

describe("etatAffiche", () => {
  it("aucune ligne : sans abonnement, sans frise, l'essai proposé", () => {
    const e = etatAffiche(null, MAINTENANT, null);
    expect(e).toMatchObject({ titre: "Sans abonnement", pastille: { etat: "aPlanifier" }, frise: null });
    expect(e.detail).toMatch(/essai gratuit de 30 jours/);
  });

  it("essai loin de sa fin : la première formule, la frise de l'essai, rien à faire", () => {
    const e = etatAffiche(ligne({ essaiUtiliseLe: jour("2026-11-10"), finEssai: jour("2026-12-10") }), MAINTENANT, null);
    expect(e.titre).toBe("Essentiel");
    expect(e.pastille).toEqual({ libelle: "Essai en cours", etat: "lointain" });
    expect(e.frise).toMatchObject({ debut: jour("2026-11-10"), fin: jour("2026-12-10"), libelleFin: "Fin de l'essai", etat: "lointain" });
  });

  it("essai à une semaine de sa fin : la paille, comme le bandeau", () => {
    const e = etatAffiche(ligne({ essaiUtiliseLe: jour("2026-10-23"), finEssai: jour("2026-11-22") }), MAINTENANT, null);
    expect(e.pastille.etat).toBe("proche");
    expect(e.frise?.etat).toBe("proche");
  });

  it("abonné : la formule et son rythme, la période déduite de sa fin, le prochain prélèvement", () => {
    const e = etatAffiche(
      ligne({ statut: "active", formule: "rojer_pro_mensuel", finPeriode: jour("2026-12-03"), debutPayantLe: jour("2026-09-03") }),
      MAINTENANT,
      null,
    );
    expect(e).toMatchObject({ titre: "Pro", detail: "Facturation mensuelle", pastille: { libelle: "Actif", etat: "faite" } });
    expect(e.frise).toMatchObject({ debut: jour("2026-11-03"), fin: jour("2026-12-03"), libelleFin: "Prochain prélèvement" });
  });

  it("abonné à l'année : la période commence un an avant sa fin", () => {
    const e = etatAffiche(
      ligne({ statut: "active", formule: "rojer_essentiel_annuel", finPeriode: jour("2027-03-03"), debutPayantLe: jour("2026-03-03") }),
      MAINTENANT,
      null,
    );
    expect(e.frise?.debut).toEqual(jour("2026-03-03"));
  });

  it("résiliation prévue : la paille, et la fin de l'abonnement au bout de la frise", () => {
    const e = etatAffiche(
      ligne({
        statut: "active",
        formule: "rojer_pro_annuel",
        finPeriode: jour("2027-03-03"),
        resilieEnFinDePeriode: true,
        debutPayantLe: jour("2026-03-03"),
      }),
      MAINTENANT,
      null,
    );
    expect(e.pastille.etat).toBe("proche");
    expect(e.frise).toMatchObject({ fin: jour("2027-03-03"), libelleFin: "Fin de l'abonnement", etat: "proche" });
  });

  it("paiement à régler : le saumon", () => {
    const e = etatAffiche(
      ligne({ statut: "past_due", formule: "rojer_essentiel_mensuel", finPeriode: jour("2026-12-15"), debutPayantLe: jour("2026-10-15") }),
      MAINTENANT,
      null,
    );
    expect(e.pastille).toEqual({ libelle: "Paiement à régler", etat: "enRetard" });
    expect(e.frise?.libelleFin).toBe("Fin de la période");
  });

  it("essai terminé : la frise va jusqu'à la suppression des données", () => {
    const e = etatAffiche(
      ligne({ essaiUtiliseLe: jour("2026-10-13"), finEssai: jour("2026-11-12"), sansAbonnementDepuis: jour("2026-11-12") }),
      MAINTENANT,
      jour("2027-11-12"),
    );
    expect(e).toMatchObject({ titre: "Sans abonnement", pastille: { libelle: "Essai terminé", etat: "enRetard" } });
    expect(e.frise).toMatchObject({
      debut: jour("2026-11-12"),
      fin: jour("2027-11-12"),
      libelleDebut: "Fin de l'essai",
      libelleFin: "Suppression des données, sauf abonnement",
    });
  });

  it("une suppression déjà due ne se dessine pas : elle se dit", () => {
    const e = etatAffiche(
      ligne({ finEssai: jour("2025-10-01"), essaiUtiliseLe: jour("2025-09-01"), sansAbonnementDepuis: jour("2025-10-01") }),
      MAINTENANT,
      jour("2026-11-01"),
    );
    expect(e.frise).toBeNull();
    expect(e.suppressionImminente).toBe(true);
  });

  it("un abonné dont la ligne garde une date de suppression (notification en retard) n'est menacé de rien", () => {
    const e = etatAffiche(
      ligne({
        statut: "active",
        formule: "rojer_pro_mensuel",
        finPeriode: jour("2026-12-03"),
        debutPayantLe: jour("2026-11-03"),
        sansAbonnementDepuis: jour("2025-10-01"),
      }),
      MAINTENANT,
      jour("2026-11-01"),
    );
    expect(e.suppressionImminente).toBe(false);
    expect(e.frise?.libelleFin).toBe("Prochain prélèvement");
  });
});
