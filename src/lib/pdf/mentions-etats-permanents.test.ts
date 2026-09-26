import { describe, expect, it } from "vitest";
import type { Obligation } from "@/lib/referentiels/conformite";
import type {
  EtatsPermanentsDuDossier,
  LigneEtatPermanent,
} from "@/lib/etats-permanents/queries";
import {
  blocEtatsPermanents,
  phraseIndetermines,
} from "./mentions-etats-permanents";

/**
 * Chacun de ces tests a été éprouvé en réinjectant le défaut qu'il prétend
 * interdire — c'est écrit branche par branche en dessous. Sans quoi une garde
 * posée sur des phrases, qu'aucun rendu ne vérifie, serait une décoration : le
 * dossier `pdf/` n'a presque aucun test de rendu, et ces phrases sont la seule
 * chose qui empêche un tableau de cases cochées d'être lu comme un constat de
 * conformité.
 */

const OBLIGATION: Obligation = {
  id: "temoin",
  domaine: "incendie",
  libelle: "Consigne de sécurité incendie affichée",
  referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
  periodicite: "autre",
  realisateurs: ["exploitant"],
  criticite: 3,
  transmet: [],
  nature: "etat_permanent",
  pieceAttendue: null,
  typologies: { erp: true },
  // Un état permanent de cette page est porté par l'établissement : il n'a
  // ni équipement déclencheur, ni salarié nommé.
  porteur: "etablissement",
};

function ligne(p: Partial<LigneEtatPermanent> & { id?: string }): LigneEtatPermanent {
  return {
    obligation: { ...OBLIGATION, id: p.id ?? OBLIGATION.id },
    mode: "etat",
    compteDansLEnTete: true,
    pieceAttendue: null,
    declareLe: null,
    note: null,
    aConfirmer: null,
    ...p,
  };
}

/** Un dossier à `total` états, dont `enPlace` déclarés, sans ligne « fait le ». */
function dossier(total: number, enPlace: number): EtatsPermanentsDuDossier {
  const lignes = Array.from({ length: total }, (_, i) =>
    ligne({
      id: `o-${i}`,
      declareLe: i < enPlace ? new Date("2026-08-12T09:00:00Z") : null,
    }),
  );
  return {
    groupes: [{ domaine: "incendie", libelle: "Incendie / sécurité", lignes }],
    faits: [],
    enPlace,
    total,
    faitsDates: 0,
    faitsDatesRenseignes: 0,
  };
}

describe("ce que le dossier de conformité dit des états permanents", () => {
  it("imprime les lignes NON déclarées autant que les déclarées", () => {
    // Éprouvé en filtrant sur `declareLe !== null` dans `blocEtatsPermanents` :
    // ce test tombe, et lui seul suffit à décrire le défaut. N'imprimer que les
    // cases cochées ferait du document une sélection avantageuse — douze coches
    // et rien sur les dix-huit autres —, ce que le registre a déjà refusé pour
    // ses fiches non recueillies.
    const bloc = blocEtatsPermanents(dossier(5, 2));
    expect(bloc.etats).toHaveLength(5);
    expect(
      bloc.etats.filter((l) => l.declaration === "Aucune déclaration"),
    ).toHaveLength(3);
  });

  it("dit qu'une ligne sans déclaration n'est pas un manquement constaté", () => {
    // La phrase existe pour un lecteur précis : le contrôleur, qui lit une
    // case vide comme une infraction là où l'écran la présente comme une
    // question sans réponse. Éprouvé en retirant la troisième phrase du
    // chapeau.
    expect(blocEtatsPermanents(dossier(3, 1)).chapeau).toContain(
      "n'est pas un manquement constaté",
    );
  });

  it("dit que Rojer n'a rien constaté, dans le même souffle", () => {
    // La mise en garde symétrique, et elle est indispensable : dire seulement
    // qu'une case vide n'accuse pas laisserait intacte la lecture inverse —
    // une case cochée vaut conformité. Les deux erreurs vont en sens
    // contraires, une seule phrase n'en couvre qu'une.
    const chapeau = blocEtatsPermanents(dossier(3, 3)).chapeau ?? "";
    expect(chapeau).toContain("Une déclaration n'est ni une vérification");
    expect(chapeau).toContain("ne l'atteste pas");
  });

  it("ne conclut jamais sur le droit, quel que soit l'état du dossier", () => {
    // Le cas dangereux est celui du dossier COMPLET : c'est là qu'une phrase
    // de félicitation se glisse, et « tout est en place » se lirait
    // « conforme ». Le cas vide est repris pour la même raison en creux.
    for (const d of [dossier(4, 4), dossier(4, 0), dossier(0, 0)]) {
      const bloc = blocEtatsPermanents(d);
      const textes = [
        bloc.chapeau ?? "",
        bloc.compteur ?? "",
        bloc.vide ?? "",
        bloc.noteFaits ?? "",
      ];
      for (const t of textes) {
        expect(t).not.toMatch(/conforme|en règle|en infraction|certifi/i);
      }
    }
  });

  it("attribue la déclaration à l'employeur, jamais au produit", () => {
    expect(blocEtatsPermanents(dossier(4, 4)).compteur).toContain(
      "par l'employeur",
    );
  });

  it("accorde le verbe sur le nombre de déclarations, pas sur le total", () => {
    // « 1 des 12 états applicables SONT déclarés » est la faute exacte que
    // `etats-permanents/phrases.ts` porte en commentaire : le sujet du verbe
    // est le premier nombre, et l'accord se perd quand un nombre s'interpole.
    // Éprouvé en supprimant la branche `enPlace === 1`.
    expect(blocEtatsPermanents(dossier(12, 1)).compteur).toBe(
      "1 des 12 états applicables est déclaré en place par l'employeur.",
    );
    expect(blocEtatsPermanents(dossier(12, 3)).compteur).toBe(
      "3 des 12 états applicables sont déclarés en place par l'employeur.",
    );
  });

  it("ne promet une colonne d'écrits attendus que s'il y en a un", () => {
    // Mesuré, pas rédigé à la main : une phrase écrite d'avance sous une liste
    // qui se calcule vieillit toute seule, et l'écran Équipe en a fait
    // l'expérience.
    expect(blocEtatsPermanents(dossier(3, 0)).chapeau).not.toContain(
      "le texte attend un écrit",
    );

    const avecPiece = dossier(3, 0);
    avecPiece.groupes[0].lignes[0].pieceAttendue = "registre de sécurité";
    const bloc = blocEtatsPermanents(avecPiece);
    expect(bloc.chapeau).toContain("Rojer ne le détient pas");
    expect(bloc.etats[0].ecritAttendu).toBe("registre de sécurité");
  });

  it("garde les lignes « fait le » hors des états et hors du compte", () => {
    // La séparation des deux verbes est la correction du contrôle visuel du
    // 2026-08-31 ; la refaire ici serait la défaire à l'impression. Éprouvé en
    // concaténant `faits` dans `etats` : ce test tombe, et le compteur devient
    // faux sans que rien d'autre proteste.
    const d = dossier(4, 2);
    d.faits = [
      ligne({
        id: "fait-1",
        mode: "fait",
        compteDansLEnTete: false,
        declareLe: new Date("2026-08-12T09:00:00Z"),
      }),
    ];
    d.faitsDates = 1;
    d.faitsDatesRenseignes = 1;

    const bloc = blocEtatsPermanents(d);
    expect(bloc.etats).toHaveLength(4);
    expect(bloc.faits).toHaveLength(1);
    expect(bloc.compteur).toContain("4 états applicables");
    expect(bloc.noteFaits).not.toBeNull();
  });

  it("emploie le verbe de l'écran, mot pour mot", () => {
    // La date sort par `phraseDeclaration`, celle-là même que la page affiche.
    // Ce test est écrit sur la chaîne littérale exprès : si quelqu'un
    // réécrivait le verbe d'un côté seulement, l'écran et le document
    // diraient deux choses de la même déclaration, et personne ne le verrait —
    // c'est la question posée à ce lot.
    const d = dossier(1, 1);
    expect(d.groupes[0].lignes[0].declareLe).not.toBeNull();
    expect(blocEtatsPermanents(d).etats[0].declaration).toBe(
      "Déclaré en place le 12/08/2026",
    );

    const f = dossier(0, 0);
    f.groupes = [];
    f.faits = [
      ligne({
        id: "fait-1",
        mode: "fait",
        compteDansLEnTete: false,
        declareLe: new Date("2026-08-12T09:00:00Z"),
      }),
    ];
    f.faitsDates = 1;
    f.faitsDatesRenseignes = 1;
    expect(blocEtatsPermanents(f).faits[0].declaration).toBe(
      "Fait le 12/08/2026",
    );
  });

  it("distingue l'état sans déclaration du fait sans date", () => {
    const d = dossier(1, 0);
    d.faits = [ligne({ id: "fait-1", mode: "fait", compteDansLEnTete: false })];
    d.faitsDates = 1;
    const bloc = blocEtatsPermanents(d);
    expect(bloc.etats[0].declaration).toBe("Aucune déclaration");
    expect(bloc.faits[0].declaration).toBe("Aucune date");
  });

  it("ne laisse pas passer la note libre du dirigeant", () => {
    // Le contrat de sortie est fermé à quatre champs, comme celui de
    // `mentions-perimetre.ts`. La donnée qu'il arrête est nommée : la note est
    // du texte écrit par un dirigeant sur sa propre conformité, pour lui-même,
    // et ce document part chez un inspecteur, un assureur ou un acquéreur.
    // Éprouvé en ajoutant `note: l.note` à la projection.
    const d = dossier(1, 1);
    d.groupes[0].lignes[0].note = "à revoir avec le comptable, cf. sinistre 2024";
    const bloc = blocEtatsPermanents(d);
    for (const l of [...bloc.etats, ...bloc.faits]) {
      expect(Object.keys(l).sort()).toEqual([
        "declaration",
        "domaine",
        "ecritAttendu",
        "libelle",
      ]);
    }
    expect(JSON.stringify(bloc)).not.toContain("sinistre 2024");
  });

  it("explique en page de garde ce qui empêche la note de conclure", () => {
    // Sans cette phrase, la page de garde imprime « 100/100 · Reste à
    // renseigner » et rien n'explique ce qui reste — c'est l'état d'avant, à
    // ceci près que le niveau `indetermine` n'existait pas encore.
    expect(phraseIndetermines(0)).toBeNull();
    expect(phraseIndetermines(1)).toContain("Un état permanent ne porte pas");
    expect(phraseIndetermines(12)).toContain("12 états permanents ne portent");

    // Elle ne pénalise pas, elle empêche de conclure : la distinction est
    // celle que `score.ts` a posée, et l'inverser ferait dire au document
    // qu'un état non déclaré est une faute.
    expect(phraseIndetermines(12)).toContain("ne pénalisent pas la note");
  });

  it("ne renvoie pas le lecteur du document à un écran qu'il n'a pas", () => {
    // Le tableau de bord écrit la même chose en nommant « Ce qui doit être en
    // place ». Le destinataire de ce document n'a pas accès à l'application :
    // le renvoi y serait une impasse.
    expect(phraseIndetermines(3)).not.toContain("Ce qui doit être en place");
  });

  it("dit d'où vient l'absence quand rien ne s'applique", () => {
    // Le silence complet ne se distinguerait pas d'un sujet que le produit ne
    // traite pas. Et il n'écrit toujours rien de rassurant : la phrase parle
    // du référentiel, pas de l'établissement.
    const bloc = blocEtatsPermanents(dossier(0, 0));
    expect(bloc.vide).toContain("d'après le référentiel de Rojer");
    expect(bloc.chapeau).toBeNull();
    expect(bloc.compteur).toBeNull();
    expect(bloc.etats).toEqual([]);
  });
});
