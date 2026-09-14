import { describe, expect, it } from "vitest";
import { moisEnRetardAvant, type AnneeRegle } from "./AnneeCalendrier";
import type { MoisRegle } from "./RegleAnnuelle";

/**
 * Le défaut que ce fichier verrouille a été trouvé **à l'écran**, par un
 * contrôle visuel — pas par un test, pas par une revue de diff, pas par
 * trois jours de relecture. Il fallait ouvrir la page.
 *
 * Un titre de salarié dépassé le 20/11/2024 était compté par le tableau de
 * bord (« 27 dépassées ») et introuvable dans le calendrier ouvert sur
 * l'année en cours, qui en annonçait 26. Deux compteurs voisins qui se
 * contredisent, aucun marqué faux — exactement ce que l'ADR-015 existe pour
 * empêcher.
 *
 * La cause n'est pas un mauvais calcul : c'est un désaccord de référentiel.
 * Le tableau de bord dit « en retard » **par rapport à aujourd'hui** ; la
 * liste range **par année de `datePrevue`**. Les deux ont raison seuls. Une
 * échéance dépassée en 2024 est en retard aujourd'hui, et elle vit sur la
 * page 2024.
 *
 * Le correctif ne déplace pas la ligne — sa date est sa date, et la porter
 * à un autre mois ferait mentir le calendrier dans l'autre sens. Il remonte
 * les MOIS concernés en tête de l'année en cours, derrière une couture qui
 * porte son compte de retards : plier n'est pas cacher, à condition que le
 * pli le dise. C'est la règle déjà appliquée aux mois passés de l'année
 * courante, un cran plus haut.
 */

const mois = (cle: string, enRetard: number): MoisRegle => ({
  cle,
  label: cle.slice(5),
  labelLong: `mois ${cle}`,
  enRetard,
  proche: 0,
  lointain: 0,
  faite: 0,
});

const annee = (a: number, mm: MoisRegle[]): AnneeRegle => ({
  annee: a,
  mois: mm,
});

describe("moisEnRetardAvant", () => {
  it("remonte le mois d'une année révolue qui porte du retard", () => {
    const regle = [
      annee(2024, [mois("2024-11", 1)]),
      annee(2026, [mois("2026-08", 3)]),
    ];

    const remontes = moisEnRetardAvant(regle, 2026);

    expect(remontes.map((m) => m.cle)).toEqual(["2024-11"]);
    // Le mois remonte avec son compte : la couture affiche ce nombre, et
    // c'est lui qui empêche le pli d'enterrer la dette.
    expect(remontes[0].enRetard).toBe(1);
  });

  it("laisse une année révolue sans retard là où elle est", () => {
    // Une vérification FAITE en 2024 est rangée. La remonter en tête de
    // 2026 dirait qu'il reste quelque chose à faire, ce qui est faux.
    const regle = [
      annee(2024, [{ ...mois("2024-06", 0), faite: 4 }]),
      annee(2026, [mois("2026-08", 1)]),
    ];

    expect(moisEnRetardAvant(regle, 2026)).toEqual([]);
  });

  it("ne remonte jamais une année future", () => {
    // Le piège symétrique : une échéance de 2029 n'est pas en retard, et
    // un filtre écrit sur `!==` au lieu de `<` la ferait remonter.
    const regle = [
      annee(2026, [mois("2026-08", 1)]),
      annee(2029, [mois("2029-06", 2)]),
    ];

    expect(moisEnRetardAvant(regle, 2026)).toEqual([]);
  });

  it("remonte plusieurs mois, de plusieurs années, dans l'ordre", () => {
    const regle = [
      annee(2023, [mois("2023-03", 2), mois("2023-09", 0)]),
      annee(2024, [mois("2024-11", 1)]),
      annee(2026, [mois("2026-08", 5)]),
    ];

    expect(moisEnRetardAvant(regle, 2026).map((m) => m.cle)).toEqual([
      "2023-03",
      "2024-11",
    ]);
  });

  it("remonte le mois d'un retard sans échéance connue, qu'aucune barre ne dessine", () => {
    // Relecture du 2026-09-14 : une ligne « à planifier » générée en 2019
    // (mise en service, aucun rapport) est en retard, comptée au bandeau, et
    // n'avait aucune carte atteignable depuis 2026 — la couture ne lisait que
    // les retards dessinés.
    const regle = [
      annee(2019, [{ ...mois("2019-05", 0), retardSansDate: 1 }]),
      annee(2026, [mois("2026-08", 0)]),
    ];

    expect(moisEnRetardAvant(regle, 2026).map((m) => m.cle)).toEqual(["2019-05"]);
  });

  it("ne rend rien quand aucune année révolue n'a de retard", () => {
    // Le cas ordinaire : la couture ne doit pas s'afficher pour rien.
    expect(moisEnRetardAvant([annee(2026, [mois("2026-08", 3)])], 2026)).toEqual(
      [],
    );
  });
});
