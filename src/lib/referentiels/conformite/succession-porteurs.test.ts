import { describe, expect, it } from "vitest";
import {
  OBLIGATIONS_RETIREES,
  obligationParId,
  obligationsConformite,
  porteurDe,
} from "./index";
import type { PorteurObligation } from "./types";

/**
 * Deux fusibles sur la succession d'une obligation — posés le 2026-09-15
 * (`lot/fusibles-referentiel`), sans construire le mécanisme qui leur manque.
 *
 * LA RÉCONCILIATION NE SAIT CONTINUER UNE LIGNE QUE DANS DEUX CAS
 * (`calendrier/generateur.ts`, `reconcilierCalendrier`) :
 *
 *  · l'ADOPTION — même porteur des deux côtés : la rangée continue, seul son
 *    identifiant d'obligation est réécrit (`adopter`, qui exige le même
 *    équipement, le même salarié, ou l'établissement des deux côtés) ;
 *  · le REPORT D'ÉCHÉANCE — N lignes d'ÉQUIPEMENT retirées au profit d'une
 *    ligne d'ÉTABLISSEMENT (`heritageDesRetirees`, table `parObligation`,
 *    consultée par la seule ligne d'établissement).
 *
 * Tout le reste casse la continuité EN SILENCE : l'ancienne ligne est archivée
 * (« Ne s'applique plus ») et la nouvelle naît « à planifier », sans rien
 * hériter. Et le porteur SALARIÉ n'est servi par aucun des deux, pour une raison
 * de plus : ses lignes naissent d'un `TitreSalarie`, dont l'`obligationId` est
 * saisi par l'employeur et qu'aucune succession ne réécrit. Le titre resterait
 * sur l'identifiant retiré — plus de ligne au calendrier, « Ne s'applique plus »
 * sur Équipe (`etatDuTitre`), hors du badge du rail.
 *
 * Aucun de ces cas n'existe au référentiel aujourd'hui. Ces tests ne corrigent
 * rien : ils font tomber la suite le jour où l'un d'eux entrerait, avec le
 * message qui dit où lire. Voir `docs/chantiers-ouverts.md` § 11, lot 2
 * (« DEUX MÉCANISMES, ET LE PREMIER PREND LE PAS »), et l'ADR-034, N4, point 5
 * (« Laissé ouvert, écrit »).
 *
 * CE QU'ILS NE GARDENT PAS, écrit pour ne pas le croire : un porteur mal
 * déclaré à la main — dans `OBLIGATIONS_RETIREES.porteur` au moment d'un
 * retrait, ou dans la table ci-dessous pour une obligation neuve — passe. Le
 * fusible des retraits recoupe le premier avec la table tant que la ligne de
 * l'obligation retirée y reste ; c'est pourquoi on ne l'en retire pas.
 */

/**
 * Le porteur de CHAQUE obligation du référentiel, relevé en appelant
 * `porteurDe` le 2026-09-15 : 154 lignes, 89 équipement, 51 établissement,
 * 14 salarié. Pas un instantané vitest : une table lue et écrite à la main.
 *
 * POURQUOI UNE TABLE. Un identifiant ne dit pas son porteur, et rien dans le
 * référentiel ne se souvient de celui qu'il avait. Le 2026-08-31, le lot
 * « faux négatifs d'ancrage » a fait passer des obligations de l'équipement à
 * l'établissement EN GARDANT LEUR IDENTIFIANT — le registre de sécurité
 * (`incendie-registre-securite`, id inchangé depuis avril), la consigne, les
 * exercices — et aucun test n'a rien vu : l'empreinte a bougé, son message dit
 * « ajoutez une ligne à l'historique », et les lignes ancrées sur un appareil
 * seront archivées sans que la nouvelle ligne d'établissement en hérite.
 *
 * Une ABSENCE veut dire « obligation neuve » ; un ÉCART, « changement de
 * porteur ». Les deux ont leur message, et ils ne se confondent plus : une
 * obligation d'équipement passée à l'établissement est présente ici, sous
 * « equipement ».
 *
 * UNE OBLIGATION RETIRÉE GARDE SA LIGNE : elle recoupe le porteur déclaré dans
 * `OBLIGATIONS_RETIREES` au moment du retrait.
 */
const PORTEURS: Readonly<Record<string, PorteurObligation>> = {
  "aeration-controle-installations-r4222-20": "etablissement",
  "aeration-erp-chauffage-ventilation-annuelle": "equipement",
  "aeration-erp-filtres-visite-periodique": "equipement",
  "aeration-erp-ps-surveillance-qualite-air-inf-250": "equipement",
  "aeration-erp-ps-surveillance-qualite-air-sup-250": "equipement",
  "aeration-habitation-vmc-gaz-annuelle": "equipement",
  "aeration-habitation-vmc-gaz-quinquennale": "equipement",
  "aeration-travail-locaux-pollution-specifique": "equipement",
  "aeration-travail-mise-en-service": "equipement",
  "aeration-travail-recyclage-semestriel": "equipement",
  "ascenseur-carnet-entretien": "equipement",
  "ascenseur-controle-technique-quinquennal": "equipement",
  "ascenseur-entretien-contrat": "equipement",
  "ascenseur-examen-annuel-securite": "equipement",
  "ascenseur-examen-semestriel-secours": "equipement",
  "ascenseur-rapport-annuel-activite": "equipement",
  "ascenseur-telealarme-liaison": "equipement",
  "ascenseur-visite-six-semaines": "equipement",
  "co-activite-etablissement-protocole-securite": "etablissement",
  "compactage-dechets-vgp-trimestrielle": "equipement",
  "conduite-salarie-attestation-medicale": "salarie",
  "conduite-salarie-autorisation": "salarie",
  "conduite-salarie-formation": "salarie",
  "cuisson-erp-appareils-annuelle": "equipement",
  "cuisson-erp-circuits-extraction-nettoyage": "equipement",
  "cuisson-erp-extinction-automatique-annuelle": "equipement",
  "cuisson-erp-filtres-hebdomadaire": "equipement",
  "cuisson-erp-verification-initiale": "equipement",
  "cuisson-gaz-installations-annuelle": "equipement",
  "eclairage-etablissement-regles-entretien": "etablissement",
  "elec-erp-cat1-4-annuelle": "equipement",
  "elec-erp-groupe-electrogene-annuel": "equipement",
  "elec-erp-groupe-electrogene-quinzaine": "equipement",
  "elec-erp-mise-en-service": "equipement",
  "elec-erp-presence-personne-qualifiee": "etablissement",
  "elec-igh-annuelle": "equipement",
  "elec-salarie-attestation-medicale-voisinage": "salarie",
  "elec-salarie-habilitation": "salarie",
  "elec-travail-carnet-prescriptions": "equipement",
  "elec-travail-consignation-registre": "equipement",
  "elec-travail-habilitation-personnel": "equipement",
  "elec-travail-mise-en-service": "equipement",
  "elec-travail-periodique-annuelle": "equipement",
  "elec-travail-rapport-quadriennal": "equipement",
  "epi-etablissement-consigne-utilisation": "etablissement",
  "epi-verification-generale-periodique": "equipement",
  "esp-declaration-mise-en-service": "equipement",
  "esp-dossier-suivi": "equipement",
  "esp-inspection-periodique": "equipement",
  "esp-inspection-periodique-generateur-vapeur": "equipement",
  "esp-intervention-reparation": "equipement",
  "esp-personnel-formation": "equipement",
  "esp-requalification-decennale": "equipement",
  "formation-securite-etablissement-information": "etablissement",
  "formation-securite-etablissement-manutention": "etablissement",
  "formation-securite-etablissement-organisation": "etablissement",
  "formation-securite-etablissement-travail-sur-ecran": "etablissement",
  "formation-securite-salarie-accueil": "salarie",
  "formation-securite-salarie-cse-sst": "salarie",
  "formation-securite-salarie-designe-competent": "salarie",
  "froid-controle-etancheite-annuel": "equipement",
  "froid-controle-etancheite-annuel-50t-detection": "equipement",
  "froid-controle-etancheite-apres-modification": "equipement",
  "froid-controle-etancheite-biennal-detection": "equipement",
  "froid-controle-etancheite-mise-en-service": "equipement",
  "froid-controle-etancheite-semestriel-500t-detection": "equipement",
  "froid-controle-etancheite-semestriel-50t": "equipement",
  "froid-controle-etancheite-trimestriel-500t": "equipement",
  "habitation-consignes-plans-intervention": "etablissement",
  "habitation-registre-securite": "etablissement",
  "habitation-verification-annuelle-installations-securite": "etablissement",
  "incendie-erp-5-sommeil-consigne-chambres": "etablissement",
  "incendie-erp-5-sommeil-contrat-entretien-sdi": "etablissement",
  "incendie-erp-5-sommeil-plans-affiches": "etablissement",
  "incendie-erp-5-visite-commission": "etablissement",
  "incendie-erp-alarme-verification-hebdomadaire": "equipement",
  "incendie-erp-baes-annuelle": "equipement",
  "incendie-erp-desenfumage-annuelle": "equipement",
  "incendie-erp-eclairage-securite-autonomie-semestrielle": "equipement",
  "incendie-erp-eclairage-securite-essai-mensuel": "equipement",
  "incendie-erp-extincteurs-annuelle": "equipement",
  "incendie-erp-extincteurs-revision-decennale": "equipement",
  "incendie-erp-pe4-entretien-installations-techniques": "etablissement",
  "incendie-erp-ria-annuelle": "equipement",
  "incendie-erp-ssi-annuelle": "equipement",
  "incendie-erp-ssi-triennale": "equipement",
  "incendie-erp-visite-commission-cat1-2-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat1-2-triennale": "etablissement",
  "incendie-erp-visite-commission-cat3-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat3-triennale": "etablissement",
  "incendie-erp-visite-commission-cat4-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale": "etablissement",
  "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale": "etablissement",
  "incendie-erp-visite-commission-cat4-triennale": "etablissement",
  "incendie-hotel-po-controle-annuel-electricite": "equipement",
  "incendie-igh-charge-calorifique-quinquennale": "etablissement",
  "incendie-igh-moyens-secours-annuelle": "equipement",
  "incendie-registre-securite": "etablissement",
  "incendie-travail-consigne-affichee": "etablissement",
  "incendie-travail-eclairage-securite-autonomie-semestrielle": "equipement",
  "incendie-travail-eclairage-securite-essai-mensuel": "equipement",
  "incendie-travail-exercice-semestriel": "etablissement",
  "incendie-travail-moyens-lutte": "equipement",
  "information-etablissement-affichages-obligatoires": "etablissement",
  "information-etablissement-avis-acces-duerp": "etablissement",
  "levage-epreuve-initiale-fonctionnement": "equipement",
  "levage-examen-adequation-mise-en-service": "equipement",
  "levage-examen-etat-conservation": "equipement",
  "levage-registre-securite-consignation": "equipement",
  "levage-remise-en-service-apres-reparation": "equipement",
  "levage-vgp-accessoires-annuelle": "equipement",
  "levage-vgp-annuelle-charges": "equipement",
  "levage-vgp-semestrielle-chariot-gerbeur": "equipement",
  "levage-vgp-semestrielle-personnes": "equipement",
  "levage-vgp-trimestrielle-force-humaine": "equipement",
  "locaux-etablissement-eau-potable": "etablissement",
  "locaux-etablissement-emplacement-restauration": "etablissement",
  "locaux-etablissement-installations-sanitaires": "etablissement",
  "locaux-etablissement-local-restauration": "etablissement",
  "porte-auto-dossier-maintenance": "equipement",
  "porte-auto-maintien-en-etat": "equipement",
  "porte-auto-portail-piete-coulissant": "equipement",
  "porte-auto-verification-initiale": "equipement",
  "porte-auto-verification-semestrielle": "equipement",
  "prevention-etablissement-cse": "etablissement",
  "prevention-etablissement-liste-personnes-qualifiees": "etablissement",
  "prevention-etablissement-reglement-interieur": "etablissement",
  "prevention-etablissement-salarie-designe": "etablissement",
  "sante-travail-etablissement-adhesion-spst": "etablissement",
  "sante-travail-etablissement-fiche-entreprise": "etablissement",
  "sante-travail-etablissement-liste-postes-risques": "etablissement",
  "sante-travail-salarie-sir": "salarie",
  "sante-travail-salarie-sir-categorie-a": "salarie",
  "sante-travail-salarie-sir-visite-intermediaire": "salarie",
  "sante-travail-salarie-vip": "salarie",
  "sante-travail-salarie-vip-adaptee": "salarie",
  "secours-etablissement-materiel": "etablissement",
  "secours-etablissement-mesures": "etablissement",
  "secours-salarie-secouriste": "salarie",
  "signalisation-etablissement-alimentation-secours-presence": "etablissement",
  "signalisation-etablissement-alimentations-secours-annuelle": "etablissement",
  "signalisation-etablissement-cheminements-evacuation": "etablissement",
  "signalisation-etablissement-entretien": "etablissement",
  "signalisation-etablissement-obstacles-zones-dangereuses": "etablissement",
  "signalisation-etablissement-risques-residuels": "etablissement",
  "signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle": "etablissement",
  "signalisation-incendie-moyens-lutte": "equipement",
  "signalisation-stockage-substances-dangereuses": "equipement",
  "stockage-dangereux-declaration-icpe": "equipement",
  "stockage-dangereux-fiches-donnees": "equipement",
  "stockage-dangereux-formation-personnel": "equipement",
  "stockage-dangereux-retention": "equipement",
  "stockage-dangereux-ventilation-locaux": "equipement",
  "stockage-dangereux-verification-etancheite": "equipement",

};

const RENVOI =
  "Voir `docs/chantiers-ouverts.md` § 11, lot 2 (« DEUX MÉCANISMES ») et " +
  "l'ADR-034, N4, point 5 (« Laissé ouvert, écrit »).";

/**
 * Une succession que la réconciliation sait CONTINUER, entre deux porteurs.
 * `null` = elle la sait ; sinon, pourquoi pas. Recopie délibérée de ce que fait
 * `reconcilierCalendrier`, pas un appel : le jour où le mécanisme s'étend, cette
 * table s'étend avec lui, dans le même commit, et c'est ce qui rend l'extension
 * visible.
 *
 * `retrait` : le report d'échéance ne sert que les obligations RETIRÉES
 * (`absorbePar`) ; une scission (`succedeA`) ne connaît que l'adoption.
 */
function successionNonServie(
  de: PorteurObligation,
  vers: PorteurObligation,
  retrait: boolean,
): string | null {
  if (de === "salarie" || vers === "salarie") {
    return (
      "PORTEUR SALARIÉ : ses lignes naissent d'un `TitreSalarie`, dont " +
      "l'`obligationId` n'est réécrit par aucune succession. Les titres " +
      "resteraient sur l'ancien identifiant : plus de ligne au calendrier, " +
      "« Ne s'applique plus » sur Équipe (`etatDuTitre`), hors du badge du rail. " +
      "Il faut d'abord faire suivre la succession aux titres — lecture " +
      "(`etatDuTitre`, `compterTitresEnRetard`, `genererVerificationsDepuisTitres`) " +
      "ou migration des `TitreSalarie` — et trancher le titre qui prime quand " +
      "une personne détient les deux."
    );
  }
  if (de === vers) return null; // adoption
  if (retrait && de === "equipement" && vers === "etablissement") return null; // report
  return (
    `CHANGEMENT DE PORTEUR ${de} → ${vers}${retrait ? "" : " par scission"} : ` +
    "ni l'adoption (même porteur) ni le report d'échéance (équipement → " +
    "établissement, pour une obligation retirée) ne le servent. L'ancienne " +
    "ligne serait archivée et la nouvelle naîtrait « à planifier », sans rien " +
    "hériter."
  );
}

describe("fusible — une obligation ne change pas de porteur sans le dire", () => {
  it("toute obligation vivante figure dans la table des porteurs", () => {
    const neuves = obligationsConformite.filter((o) => !(o.id in PORTEURS));
    expect(
      neuves.map((o) => `  "${o.id}": "${porteurDe(o)}",`),
      "Obligation(s) NEUVE(S), absente(s) de `PORTEURS`. Collez les lignes " +
        "ci-dessus dans la table (ordre alphabétique) — après avoir vérifié " +
        "qu'aucune n'est une obligation EXISTANTE renommée, auquel cas l'ancien " +
        "identifiant doit être inscrit à `OBLIGATIONS_RETIREES` avec son porteur.",
    ).toEqual([]);
  });

  it("aucune obligation n'a changé de porteur en gardant son identifiant", () => {
    const ecarts = obligationsConformite
      .filter((o) => o.id in PORTEURS && PORTEURS[o.id] !== porteurDe(o))
      .map((o) => `${o.id} — ${PORTEURS[o.id]} → ${porteurDe(o)}`);
    expect(
      ecarts,
      "CHANGEMENT DE PORTEUR en gardant l'identifiant. Il archive les lignes de " +
        "l'ancien porteur et fait naître la nouvelle « à planifier », sans rien " +
        "hériter — ce qu'a fait le lot « faux négatifs d'ancrage » le " +
        "2026-08-31, en silence. NE CORRIGEZ PAS LA TABLE D'ABORD. Soit un NOUVEL " +
        "identifiant, l'ancien inscrit à `OBLIGATIONS_RETIREES` avec " +
        "`absorbePar` et son porteur (servi pour équipement → établissement), " +
        "soit la décision écrite d'accepter la perte de continuité, et alors " +
        "seulement la table. " +
        RENVOI,
    ).toEqual([]);
  });

  it("une ligne de la table qui n'est plus vivante est un retrait déclaré, au même porteur", () => {
    const vivants = new Set(obligationsConformite.map((o) => o.id));
    const fautes = Object.entries(PORTEURS).flatMap(([id, porteur]) => {
      if (vivants.has(id)) return [];
      const retrait = OBLIGATIONS_RETIREES[id];
      if (retrait === undefined) {
        return [`${id} — disparu sans être inscrit à \`OBLIGATIONS_RETIREES\``];
      }
      return retrait.porteur === porteur
        ? []
        : [
            `${id} — retiré en se déclarant « ${retrait.porteur} », la table le ` +
              `connaissait « ${porteur} »`,
          ];
    });
    expect(
      fautes,
      "Une obligation a quitté le référentiel. Gardez sa ligne dans `PORTEURS` : " +
        "elle recoupe le porteur écrit dans `OBLIGATIONS_RETIREES`.",
    ).toEqual([]);
  });

  it("chaque retrait avec absorbant relie deux porteurs que la réconciliation sait continuer", () => {
    // Lit `OBLIGATIONS_RETIREES.porteur`, écrit au retrait — pas la table :
    // une ligne effacée de la table ne doit pas pouvoir faire passer un
    // salarié pour un équipement.
    const nonServis = Object.entries(OBLIGATIONS_RETIREES).flatMap(
      ([id, r]) => {
        if (r.absorbePar === null) return [];
        const absorbant = obligationParId(r.absorbePar);
        // Absorbant disparu : `conformite.test.ts` le signale déjà.
        if (absorbant === undefined) return [];
        const raison = successionNonServie(
          r.porteur,
          porteurDe(absorbant),
          true,
        );
        return raison === null ? [] : [`${id} → ${r.absorbePar} : ${raison}`];
      },
    );
    expect(
      nonServis,
      "`absorbePar` déclare une succession que `reconcilierCalendrier` ne sait " +
        "pas continuer. " +
        RENVOI,
    ).toEqual([]);
  });

  it("chaque `succedeA` relie deux porteurs que la réconciliation sait continuer", () => {
    const nonServis = obligationsConformite.flatMap((o) =>
      (o.succedeA ?? []).flatMap((pred) => {
        const predecesseur = obligationParId(pred);
        if (predecesseur === undefined) return [];
        const raison = successionNonServie(
          porteurDe(predecesseur),
          porteurDe(o),
          false,
        );
        return raison === null ? [] : [`${o.id} succède à ${pred} : ${raison}`];
      }),
    );
    expect(
      nonServis,
      "`succedeA` déclare une succession que `reconcilierCalendrier` ne sait " +
        "pas continuer. " +
        RENVOI,
    ).toEqual([]);
  });
});
