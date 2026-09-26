import type { FraicheurCalendrier } from "@/lib/calendrier/fraicheur";
import { describe, expect, it } from "vitest";
import { evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import {
  ligneDuerp,
  ligneVerifsEnRetard,
  type EtatDuerpLu,
} from "./checklist-controle";

/**
 * Ces deux lignes partent dans le ZIP remis à un inspecteur. Elles ont été
 * écrites fausses une première fois, le 2026-09-20, de deux façons opposées —
 * l'une cochait une bonne nouvelle sur du vide, l'autre imputait un manquement
 * que le texte n'impose pas. Les tests ci-dessous tiennent les deux sens.
 *
 * L'état du DUERP est construit par `evaluerEtatDuerp`, jamais à la main : un
 * objet littéral ferait passer au vert une règle d'effectif que le module
 * n'appliquerait plus.
 */

const LE_JOUR = new Date("2026-09-20T10:00:00Z");
const IL_Y_A_14_MOIS = new Date("2025-07-20T10:00:00Z");
const IL_Y_A_2_MOIS = new Date("2026-07-20T10:00:00Z");

const etat = (effectif: number, version: Date | null): EtatDuerpLu =>
  evaluerEtatDuerp(
    { ouvert: true, dateDerniereVersion: version, effectif },
    LE_JOUR,
  );

describe("la ligne DUERP n'invente pas de manquement", () => {
  it("SOUS ONZE SALARIÉS, une version de 14 mois n'est PAS un manquement", () => {
    // R. 4121-2 1° : la mise à jour annuelle vaut « dans les entreprises d'au
    // moins onze salariés ». La première rédaction comparait à douze mois sans
    // l'effectif : un restaurant de six salariés recevait « [!] dernière
    // version de plus de 12 mois » dans le dossier remis au contrôleur.
    const l = ligneDuerp(etat(6, IL_Y_A_14_MOIS));
    expect(l).not.toContain("[!]");
    expect(l).toContain("ne vous est pas exigée");
  });

  it("À ONZE SALARIÉS ET PLUS, la même version EST un manquement", () => {
    // Le pendant : la correction ne doit pas effacer le cas où la règle
    // s'applique vraiment. Sans cette assertion, rendre toujours « [ ] »
    // passerait au vert.
    const l = ligneDuerp(etat(11, IL_Y_A_14_MOIS));
    expect(l).toContain("[!]");
    expect(l).toContain("R. 4121-2");
  });

  it("une version récente se coche, quel que soit l'effectif", () => {
    expect(ligneDuerp(etat(6, IL_Y_A_2_MOIS))).toContain("[x]");
    expect(ligneDuerp(etat(40, IL_Y_A_2_MOIS))).toContain("[x]");
  });

  it("sans version figée, la case reste VIDE — ni cochée, ni alarmée", () => {
    for (const e of [null, etat(6, null), etat(40, null)]) {
      const l = ligneDuerp(e);
      expect(l).toContain("[ ]");
      expect(l).toContain("aucune version figée");
    }
  });

  it("la règle d'effectif n'est pas recopiée ici", () => {
    // Garde de conception : le seuil vient de `evaluerEtatDuerp`. Si quelqu'un
    // réécrivait « effectif >= 11 » dans `checklist-controle.ts`, ce test ne
    // le verrait pas — mais celui-ci le verrait : l'état est construit par le
    // module qui porte la règle, et c'est lui qui décide.
    expect(etat(10, IL_Y_A_14_MOIS).soumisMajAnnuelle).toBe(false);
    expect(etat(11, IL_Y_A_14_MOIS).soumisMajAnnuelle).toBe(true);
  });
});

describe("la ligne des retards ne coche jamais sur du vide", () => {
  const A_JOUR = { etat: "a_jour" } as const;
  const lu = (nbEnRetard: number | null, calendrier: FraicheurCalendrier | null = A_JOUR, aucunEquipement = false) =>
    ligneVerifsEnRetard({ nbEnRetard, calendrier, aucunEquipement });

  it("NE PAS SAVOIR ne se coche pas", () => {
    // Le défaut d'origine : le compteur, initialisé à `0` hors du `try`,
    // restait à zéro quand la brique échouait.
    const l = lu(null);
    expect(l).toContain("[ ]");
    expect(l).toContain("non déterminé");
    expect(l).not.toContain("[x]");
  });

  it("zéro retard SUR UN CALENDRIER JAMAIS CALCULÉ ne se coche pas — le défaut du 2026-09-26", () => {
    // Relecture du 2026-09-26 : une liste vide venue d'un calendrier jamais
    // calculé cochait « [x] Aucune vérification en retard à ce jour ».
    const l = lu(0, { etat: "jamais_genere" });
    expect(l).not.toContain("[x]");
    expect(l).toContain("Calendrier jamais calculé");
  });

  it("zéro retard SANS AUCUN ÉQUIPEMENT ne se coche pas", () => {
    const l = lu(0, A_JOUR, true);
    expect(l).not.toContain("[x]");
    expect(l).toContain("Aucun équipement déclaré");
  });

  it("zéro retard sur un calendrier à recalculer ne se coche pas ; un retard constaté s'y annonce", () => {
    const perime = { etat: "perime", sceauPose: "a", sceauAttendu: "b" } as const;
    expect(lu(0, perime)).not.toContain("[x]");
    expect(lu(2, perime)).toContain("[!] 2 vérification(s)");
  });

  it("zéro retard sur un calendrier à jour, avec des équipements, se coche", () => {
    const l = lu(0);
    expect(l).toContain("[x]");
    expect(l).not.toContain("non déterminé");
  });

  it("un retard s'annonce, avec son compte et où le lire", () => {
    const l = lu(3);
    expect(l).toContain("[!]");
    expect(l).toContain("3 vérification(s)");
    expect(l).toContain("01_Dossier_conformite.pdf");
  });

  it("les cas rendent des lignes DISTINCTES", () => {
    const lignes = [
      lu(null),
      lu(0, { etat: "jamais_genere" }),
      lu(0, A_JOUR, true),
      lu(0, { etat: "echec_regeneration" }),
      lu(0),
      lu(2),
    ];
    expect(new Set(lignes).size).toBe(lignes.length);
  });
});
