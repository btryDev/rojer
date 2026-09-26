// Le dossier de conformité porte-t-il vraiment ce qu'on lui a donné ?
//
// Ce fichier existe pour une raison écrite deux fois dans ce dossier, par deux
// modules qui ne se connaissent pas : « le dossier `pdf/` n'a aucun test de
// rendu, et une condition inversée dans le JSX passait la suite verte »
// (`mentions-couverture.ts`, `mentions-perimetre.ts`). Les phrases des états
// permanents sont testées à côté, une par une ; rien ne vérifiait qu'elles
// atteignent une page.
//
// CE QUE CE TEST NE PEUT PAS FAIRE, ET IL FAUT LE DIRE : le texte d'un PDF
// react-pdf n'est pas lisible dans le fichier produit — les flux sont
// compressés ET la police est sous-ensemblée, si bien qu'après décompression on
// obtient des identifiants de glyphes, pas des mots. Vérifié plutôt que
// supposé : une sonde qui inflate tous les flux ne retrouve aucune des chaînes
// rendues. Chercher une phrase dans le document est donc hors de portée d'un
// test unitaire, et c'est une limite du garde-fou, pas une négligence.
//
// CE QU'IL FAIT À LA PLACE : il compte les pages. Un tableau qu'on ne rend pas
// n'en fait pas déborder. Trente-cinq lignes tiennent forcément sur plus de
// pages que quatre — sauf si le JSX ne les rend pas, et c'est exactement le
// défaut qu'on veut voir tomber.

import { describe, expect, it } from "vitest";
import { elementsDansLOrdre } from "./arbre-rendu.test-utils";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  DossierConformiteDocument,
  type DossierData,
} from "./DossierConformiteDocument";
import type { BlocEtatsPermanents } from "./mentions-etats-permanents";

const VIDE: BlocEtatsPermanents = {
  chapeau: null,
  compteur: null,
  etats: [],
  faits: [],
  noteFaits: null,
  vide: "Aucune obligation de ce type ne s'applique à cet établissement.",
};

function lignes(n: number, prefixe: string) {
  return Array.from({ length: n }, (_, i) => ({
    libelle: `${prefixe} — obligation ${i + 1}`,
    domaine: "Incendie / sécurité",
    ecritAttendu: i % 3 === 0 ? "registre de sécurité" : null,
    declaration: i % 2 === 0 ? "Déclaré en place le 12/08/2026" : "Aucune déclaration",
  }));
}

function bloc(nbEtats: number, nbFaits = 0): BlocEtatsPermanents {
  return {
    chapeau: "Ces obligations n'ont pas d'échéance.",
    compteur: `${Math.ceil(nbEtats / 2)} des ${nbEtats} états applicables…`,
    etats: lignes(nbEtats, "État"),
    faits: lignes(nbFaits, "Fait"),
    noteFaits: nbFaits > 0 ? "Le texte les fait revenir sans dire à quel rythme." : null,
    vide: null,
  };
}

function dossier(etatsPermanents: BlocEtatsPermanents): DossierData {
  return {
    entreprise: "Btry",
    siret: "12345678900011",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas",
    effectifSurSite: 6,
    codeNaf: "56.10A",
    regimesTexte: "Établissement de travail, ERP type N cat. 5",
    regime: { estERP: true, estIGH: false },
    genereLe: new Date("2026-09-01T10:00:00Z"),
    couverture: null,
    avertissementCalendrier: null,
    score: {
      valeur: 100,
      niveau: "indetermine",
      libelle: "Reste à renseigner",
      indetermines: 12,
    },
    etatsPermanents,
    duerp: null,
    compteurs: {
      verifsEnRetard: 0,
      verifsPlanifiees: 0,
      verifsRealisees12m: 0,
      actionsOuvertes: 0,
      actionsEnRetard: 0,
    },
    rapportsRecents: [],
    verifsEnRetard: [],
    actionsEnCours: [],
  };
}

/** Le nombre de pages d'un PDF, lu dans son catalogue d'objets. */
function nombreDePages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

async function pages(data: DossierData): Promise<number> {
  const buf = await renderToBuffer(DossierConformiteDocument({ data }));
  return nombreDePages(Buffer.from(buf));
}

/** La taille du rendu. Le fichier compare déjà des NOMBRES DE PAGES pour
 *  prouver qu'un tableau est rendu et pas seulement annoncé ; un encadré de
 *  page de garde n'ajoute pas de page, mais il ajoute du contenu. C'est le
 *  même raisonnement, à l'échelle en dessous — et il se casse pour la bonne
 *  raison : retirez le JSX, les deux tailles s'égalisent.
 *
 *  Pourquoi pas une recherche de la phrase : `@react-pdf` écrit le texte en
 *  flux compressés, avec des polices sous-ensemblées. Un extracteur maison
 *  rendait une chaîne vide, donc le test « reste muet » passait sans rien
 *  vérifier — un faux vert vaut moins que pas de test. */
async function taille(data: DossierData): Promise<number> {
  const buf = await renderToBuffer(DossierConformiteDocument({ data }));
  return Buffer.from(buf).length;
}

const AVERTISSEMENT =
  "Le calendrier des vérifications n'a pas encore été calculé pour ce " +
  "dossier : ce qui suit ne recense aucune échéance, ce qui ne veut pas dire " +
  "qu'il n'y en a pas. Ouvrez le tableau de bord ou le calendrier.";

describe("le dossier dit quand son calendrier n'est pas à jour", () => {
  it("imprime quelque chose de plus quand il y a un avertissement", async () => {
    // LE DÉFAUT D'ORIGINE : ce document a imprimé « 0 vérification en retard »
    // pour des dossiers dont le calendrier n'avait jamais été calculé. Zéro s'y
    // lit comme une bonne nouvelle, et ce PDF part chez un tiers.
    const d = dossier(bloc(4));
    const sans = await taille(d);
    const avec = await taille({ ...d, avertissementCalendrier: AVERTISSEMENT });
    expect(avec).toBeGreaterThan(sans);
  });

  it("reste identique quand le calendrier est à jour", async () => {
    // Un bandeau permanent cesserait d'être lu : c'est le sort de tout
    // avertissement qui s'affiche toujours. `null` ne doit donc RIEN ajouter.
    const d = dossier(bloc(4));
    expect(await taille({ ...d, avertissementCalendrier: null })).toBe(
      await taille(d),
    );
  });
});

describe("le dossier de conformité imprime les états permanents", () => {
  it("rend les lignes, et pas seulement le chapeau qui les annonce", async () => {
    // Éprouvé en retirant `<TableauEtats …>` du JSX : les deux comptes
    // s'égalisent et ce test tombe. C'est le seul garde-fou qui verrait un
    // tableau annoncé par une phrase et jamais rendu.
    const peu = await pages(dossier(bloc(4)));
    const beaucoup = await pages(dossier(bloc(35)));
    expect(beaucoup).toBeGreaterThan(peu);
  });

  it("rend aussi les lignes « fait le », qui ont leur propre tableau", async () => {
    // Un second tableau oublié se remarquerait d'autant moins qu'il ne porte
    // souvent qu'une ou deux lignes sur un dossier réel.
    const sans = await pages(dossier(bloc(4)));
    const avec = await pages(dossier(bloc(4, 35)));
    expect(avec).toBeGreaterThan(sans);
  });

  it("écrit bien la phrase du cas « rien ne s'applique »", async () => {
    // PREMIÈRE RÉDACTION FAUSSE, ET C'EST LE TEST QUI L'A DIT — après coup.
    // Elle comparait le nombre de pages du cas vide à celui d'un dossier d'une
    // ligne, et les deux valaient 5. En remplaçant le rendu de la phrase par
    // `null`, ELLE RESTAIT VERTE : une page portant un titre et un pied de
    // page compte pour une page qu'elle dise quelque chose ou non. La garde
    // était une décoration, exactement de la sorte que ce dépôt a décidé de ne
    // plus laisser passer.
    //
    // Le texte d'un PDF n'étant pas lisible (voir l'en-tête de ce fichier), ce
    // qui reste mesurable est le VOLUME. Une phrase répétée deux cents fois
    // déborde sur d'autres pages si elle est rendue, et sur aucune si la
    // branche est escamotée. Le procédé est artificiel ; il constate la seule
    // chose qu'un test puisse constater ici, et il tombe sur le défaut.
    const court = await pages(dossier(VIDE));
    const long = await pages(
      dossier({ ...VIDE, vide: (VIDE.vide + " ").repeat(200) }),
    );
    expect(long).toBeGreaterThan(court);
  });

  it("s'imprime avec un score qu'aucune couleur n'attendait", async () => {
    // `indetermine` est le niveau ajouté au score le 2026-09-01. La page de
    // garde le colorait par une chaîne de ternaires à défaut par épuisement :
    // il y tombait dans l'encre de « Rattrapage nécessaire ». La table qui l'a
    // remplacée est indexée par `Score["niveau"]`, donc le compilateur tient
    // la garantie ; ce test vérifie seulement que le rendu passe pour les
    // quatre niveaux, y compris celui que personne n'avait prévu.
    for (const niveau of [
      "satisfaisante",
      "a_surveiller",
      "rattrapage",
      "indetermine",
    ] as const) {
      const d = dossier(bloc(2));
      d.score = { ...d.score, niveau };
      await expect(pages(d)).resolves.toBeGreaterThan(0);
    }
  });
});

describe("le dossier dit « aucun équipement déclaré » avant le score (§ 15)", () => {
  const INVENTAIRE = {
    motif: "Aucun équipement en service n'est déclaré pour cet établissement.",
    consequence:
      "Aucune vérification attachée à un équipement ne peut donc figurer au calendrier ni au registre.",
  };

  it("imprime le fait en page de garde, pas seulement en fin de dossier", async () => {
    // Même phrase, même bloc en fin de dossier sous « Ce que ce dossier ne
    // couvre pas » : seul l'axe diffère. Ce qui reste de différence est
    // l'encadré de page de garde — celui qu'on lit avant le score.
    const d = dossier(bloc(2));
    const autreAxe = await taille({
      ...d,
      couverture: {
        manques: [{ axe: "domaine_equipement", ...INVENTAIRE }],
        indeterminations: [],
      },
    });
    const inventaire = await taille({
      ...d,
      couverture: {
        manques: [{ axe: "inventaire", ...INVENTAIRE }],
        indeterminations: [],
      },
    });
    expect(inventaire).toBeGreaterThan(autreAxe);
  });
});

describe("le fait de l'inventaire se lit avant le score", () => {
  it("l'encadré précède la ligne de score dans l'ordre du document", () => {
    const motif = "Aucun équipement n'est déclaré pour cet établissement.";
    const d: DossierData = {
      ...dossier(bloc(2)),
      couverture: {
        manques: [{ axe: "inventaire", motif, consequence: "Conséquence." }],
        indeterminations: [],
      },
    };
    const noeuds = elementsDansLOrdre(DossierConformiteDocument({ data: d }));
    const encadre = noeuds.findIndex(
      (n) => n.type === "EncadreALire" && n.props.titre === motif,
    );
    const score = noeuds.findIndex((n) => n.type === "ScoreLigne");
    expect(encadre).toBeGreaterThan(-1);
    expect(score).toBeGreaterThan(-1);
    expect(encadre).toBeLessThan(score);
  });
});

describe("les articles du registre suivent le régime", () => {
  it("un établissement ni ERP ni IGH en lit moins qu'un ERP situé en IGH", async () => {
    const d = dossier(bloc(2));
    const aucun = await taille({ ...d, regime: { estERP: false, estIGH: false } });
    const erp = await taille({ ...d, regime: { estERP: true, estIGH: false } });
    const igh = await taille({ ...d, regime: { estERP: true, estIGH: true } });
    expect(erp).toBeGreaterThan(aucun);
    expect(igh).toBeGreaterThan(erp);
  });
});
