import { describe, expect, it } from "vitest";
import { repartirVerifications } from "./etat-verifications";

// Horloge de référence : mardi 23 avril 2026, 09:00 heure de Paris.
const NOW = new Date("2026-04-23T07:00:00Z");

function verif(
  statut: string,
  datePrevueIso: string,
  dateRealiseeIso: string | null = null,
) {
  return {
    statut,
    datePrevue: new Date(datePrevueIso),
    dateRealisee: dateRealiseeIso === null ? null : new Date(dateRealiseeIso),
    // Pas de rapport dans ces fixtures : la réalisation passe par la colonne
    // gelée, que la répartition lit en repli (ADR-034). Le cas « rapport » a
    // son propre test plus bas.
    derniereRealisation: null as Date | null,
    // Requis depuis que le marqueur d'archivage se lit à la racine des
    // prédicats. Nu = ligne ACTIVE ; le cas archivé a son propre test, qui
    // passe un libellé marqué.
    libelleObligation: "Vérification périodique",
  };
}

describe("repartirVerifications", () => {
  it("classe chaque occurrence dans une seule catégorie", () => {
    const verifs = [
      verif("depassee", "2026-03-01T00:00:00Z"),
      verif("planifiee", "2026-04-20T00:00:00Z"), // échéance passée
      verif("a_planifier", "2026-04-10T00:00:00Z"), // échéance passée
      verif("a_planifier", "2026-05-30T00:00:00Z"), // pas encore due
      verif("planifiee", "2026-05-10T00:00:00Z"), // dans 17 jours
      verif("realisee_conforme", "2026-01-15T00:00:00Z", "2026-01-16T00:00:00Z"),
    ];

    const etat = repartirVerifications(verifs, NOW);

    expect(etat.enRetard).toHaveLength(3);
    expect(etat.aPlanifier).toHaveLength(1);
    expect(etat.aVenir).toHaveLength(1);
    expect(etat.realisees12m).toHaveLength(1);
    expect(etat.total).toBe(6);
  });

  it("compte `a_planifier` en retard dès que la date est passée", () => {
    // Point d'arbitrage d'ADR-011 : ce n'est pas le statut qui crée
    // l'obligation, c'est la date.
    const etat = repartirVerifications(
      [verif("a_planifier", "2026-04-22T00:00:00Z")],
      NOW,
    );
    expect(etat.enRetard).toHaveLength(1);
    expect(etat.aPlanifier).toHaveLength(0);
  });

  it("ne met jamais une échéance du jour en retard", () => {
    const etat = repartirVerifications(
      [
        verif("planifiee", "2026-04-23T00:00:00Z"),
        verif("a_planifier", "2026-04-23T00:00:00Z"),
      ],
      NOW,
    );
    expect(etat.enRetard).toHaveLength(0);
    expect(etat.aVenir).toHaveLength(1);
    expect(etat.aPlanifier).toHaveLength(1);
  });

  it("ignore une occurrence planifiée au-delà de l'horizon proche", () => {
    // Ni engagement de la période, ni retard : elle n'entre dans aucune
    // catégorie et ne gonfle donc pas le dénominateur du score.
    const etat = repartirVerifications(
      [verif("planifiee", "2026-11-02T00:00:00Z")],
      NOW,
    );
    expect(etat.total).toBe(0);
  });

  it("inclut `aPlanifier` dans le total — le dénominateur du score", () => {
    // Le dossier de conformité l'omettait, si bien que le score imprimé
    // était supérieur à celui du tableau de bord à la même seconde.
    const etat = repartirVerifications(
      [
        verif("a_planifier", "2026-06-01T00:00:00Z"),
        verif("a_planifier", "2026-07-01T00:00:00Z"),
      ],
      NOW,
    );
    expect(etat.aPlanifier).toHaveLength(2);
    expect(etat.total).toBe(2);
  });

  it("borne l'historique à douze mois calendaires", () => {
    const etat = repartirVerifications(
      [
        // Pile douze mois avant : conservée.
        verif("realisee_conforme", "2025-04-23T00:00:00Z", "2025-04-23T00:00:00Z"),
        // La veille de la borne : sortie de la fenêtre.
        verif("realisee_conforme", "2025-04-22T00:00:00Z", "2025-04-22T00:00:00Z"),
      ],
      NOW,
    );
    expect(etat.realisees12m).toHaveLength(1);
  });

  it("ne compte jamais une occurrence réalisée comme en retard", () => {
    // La preuve prime sur l'état : un rapport existe, le statut n'a pas été
    // rafraîchi, l'échéance est loin derrière.
    const etat = repartirVerifications(
      [verif("planifiee", "2026-01-05T00:00:00Z", "2026-01-06T00:00:00Z")],
      NOW,
    );
    expect(etat.enRetard).toHaveLength(0);
    expect(etat.realisees12m).toHaveLength(1);
  });

  it("les quatre ensembles restent disjoints (pas de double compte)", () => {
    const verifs = [
      verif("depassee", "2026-02-01T00:00:00Z"),
      verif("a_planifier", "2026-04-25T00:00:00Z"),
      verif("planifiee", "2026-04-24T00:00:00Z"),
      verif("realisee_observations", "2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z"),
    ];
    const etat = repartirVerifications(verifs, NOW);
    const tous = [
      ...etat.enRetard,
      ...etat.aPlanifier,
      ...etat.aVenir,
      ...etat.realisees12m,
    ];
    expect(new Set(tous).size).toBe(tous.length);
    expect(etat.total).toBe(verifs.length);
  });

  it("une ligne roulée compte UNE fois : son échéance ouverte prime (ADR-034)", () => {
    // Contrôle fait en mars, lu sur le rapport ; la ligne a roulé et son
    // échéance ouverte tombe dans l'horizon proche. Elle compte là, et pas une
    // seconde fois dans les réalisations : sinon le dénominateur du score
    // enflerait et un retard coûterait moins cher sur un appareil contrôlé
    // récemment que sur un autre.
    const roulee = {
      ...verif("planifiee", "2026-05-10T00:00:00Z"),
      derniereRealisation: new Date("2026-03-02T00:00:00Z"),
    };
    const etat = repartirVerifications([roulee], NOW);
    expect(etat.aVenir).toHaveLength(1);
    expect(etat.realisees12m).toHaveLength(0);
    expect(etat.total).toBe(1);
  });

  it("la même ligne compte comme réalisée quand son prochain rendez-vous est lointain", () => {
    // Contrôlée en mars, prochaine échéance en décembre : rien à faire dans
    // l'horizon, mais le dossier a bien un contrôle à son actif.
    const roulee = {
      ...verif("planifiee", "2026-12-10T00:00:00Z"),
      derniereRealisation: new Date("2026-03-02T00:00:00Z"),
    };
    const etat = repartirVerifications([roulee], NOW);
    expect(etat.realisees12m).toHaveLength(1);
    expect(etat.total).toBe(1);
  });

  it("et une échéance ouverte dépassée sur un appareil contrôlé compte en retard", () => {
    // Le lot 3 bis : l'ancien modèle sortait cette ligne de TOUS les comptes.
    const roulee = {
      ...verif("planifiee", "2026-04-01T00:00:00Z"),
      derniereRealisation: new Date("2025-04-01T00:00:00Z"),
    };
    const etat = repartirVerifications([roulee], NOW);
    expect(etat.enRetard).toHaveLength(1);
    expect(etat.realisees12m).toHaveLength(0);
    expect(etat.total).toBe(1);
  });

  it("un retard coûte le même prix, que le dernier contrôle soit récent ou vieux", () => {
    // LA MESURE QUI A TRANCHÉ (2026-09-12). Dix lignes contrôlées, trois
    // échéances dépassées. En comptant deux fois une ligne roulée, le même
    // dossier sortait à 13 éléments quand son dernier rapport datait de trois
    // mois, et à 10 quand il datait de plus d'un an : le retard était dilué.
    // Les deux dates tombent dans la fenêtre de douze mois : ce qui les
    // distingue est la RÉCENCE, et c'est précisément ce qui ne doit rien
    // changer au prix d'un retard.
    const recent = new Date("2026-03-20T00:00:00Z");
    const vieux = new Date("2025-06-20T00:00:00Z");
    const dossier = (derniere: Date) => [
      ...Array.from({ length: 3 }, () => ({
        ...verif("planifiee", "2026-04-01T00:00:00Z"),
        derniereRealisation: derniere,
      })),
      ...Array.from({ length: 7 }, () => ({
        ...verif("planifiee", "2026-12-01T00:00:00Z"),
        derniereRealisation: derniere,
      })),
    ];

    const a = repartirVerifications(dossier(recent), NOW);
    const b = repartirVerifications(dossier(vieux), NOW);
    expect(a.total).toBe(10);
    expect(b.total).toBe(10);
    expect(a.enRetard).toHaveLength(3);
    expect(b.enRetard).toHaveLength(3);
  });
});
