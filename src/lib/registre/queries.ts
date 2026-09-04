// Lecture : la composition du registre pour un établissement réel.
//
// `composition.ts` est pur et ne connaît pas la base. Ce module fait le pont :
// il projette l'établissement et son parc dans la forme minimale attendue par
// le moteur (`EtablissementMatching`, `EquipementMatching`) et rend les fiches
// dues, regroupées par partie.
//
// La projection est la même que celle du calendrier (`calendrier/actions.ts`) :
// même onze champs, même sémantique. Les deux doivent répondre à partir des
// mêmes faits — un registre qui annoncerait une fiche que le calendrier ignore
// serait un troisième avis sur la même question.

import { trierParCategorie } from "@/lib/equipements/labels";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { cleJourCivil } from "@/lib/dates";
import { composerRegistreParPartie, type PartieDue } from "./composition";
import { CHAMPS_PAR_SECTION } from "./champs";
import { lireContenu, lignesDuJournal } from "./schema";

/**
 * Ce qu'une fiche a déjà recueilli, prêt à rendre — l'un ou l'autre, jamais
 * les deux : une fiche est un formulaire ou un journal, pas les deux à la fois.
 */
export type ContenuLu =
  | { champs?: Record<string, string | null>; lignes?: undefined }
  | { lignes?: ReturnType<typeof lignesDuJournal>; champs?: undefined };

export type RegistreDeLEtablissement = {
  parties: PartieDue[];
  /**
   * Par identifiant de fiche : ce qu'elle porte déjà.
   *
   * Les fiches adossées à l'établissement y figurent aussi, alimentées depuis
   * les colonnes qui portent leurs réponses. Elles ne stockent rien en propre
   * — c'est tout leur intérêt, une seule source — mais l'écran n'a pas à
   * connaître cette différence pour les afficher.
   */
  contenus: Record<string, ContenuLu>;
  /**
   * Quand chaque fiche a été mise à jour pour la dernière fois.
   *
   * Le registre imprimé porte sur chaque feuille un « Date ou mise à jour :
   * le … », et ce n'est pas de l'ornement : devant une commission, une fiche
   * sans date de tenue ne prouve rien. Absente pour les fiches qu'un autre
   * écran alimente — leur fraîcheur est celle du parc ou du calendrier, et
   * inventer une date ici serait pire que n'en imprimer aucune.
   */
  misAJourLe: Record<string, Date>;
};

/**
 * Le registre d'un établissement : les fiches dues, et ce qu'elles portent
 * déjà. `null` si l'établissement n'existe pas ou n'appartient pas à
 * l'utilisateur — le scope est porté ici, pas par l'appelant.
 *
 * Mémoïsée par le `cache()` de React, dont la portée est la requête. La liste
 * et l'écran d'une fiche lisent le même registre ; sans cela, une page qui
 * aurait besoin des deux paierait deux fois la même lecture. Même motif que
 * `lireUserCourant`.
 */
export const composerRegistreDeLEtablissement = cache(
  async (
    etablissementId: string,
  ): Promise<RegistreDeLEtablissement | null> => {
    const user = await requireUser();
    const etab = await prisma.etablissement.findFirst({
      where: { id: etablissementId, entreprise: { userId: user.id } },
      select: {
        id: true,
        effectifSurSite: true,
        estEtablissementTravail: true,
        estERP: true,
        estIGH: true,
        estHabitation: true,
        typeErp: true,
        categorieErp: true,
        classeIgh: true,
        familleHabitation: true,
        personnesPresentesHabituellement: true,
        manipuleMatieresR422722: true,
        comporteLocauxSommeilPublic: true,
        // Seul le parc en service compte (ADR-012) : un appareil retiré ne fait
        // plus apparaître sa fiche d'inventaire ni sa fiche de vérification.
        // Les colonnes que les fiches « Renseignements généraux » et
        // « Établissement recevant du public » relisent (CCH R. 143-44).
        raisonDisplay: true,
        adresse: true,
        natureActivite: true,
        effectifPublicAdmis: true,
        dateAutorisationOuverture: true,
        dateCertificatConformite: true,
        entreprise: { select: { raisonSociale: true, adresse: true } },
        equipements: {
          where: { actif: true },
          select: { id: true, libelle: true, categorie: true },
          // Idem : le tri par catégorie est posé après la lecture, l'ordre de
          // l'enum en base n'étant pas celui de `CATEGORIES_EQUIPEMENT`.
          orderBy: [{ createdAt: "asc" }],
        },
        updatedAt: true,
        fichesRegistre: {
          select: { sectionId: true, contenu: true, updatedAt: true },
        },
      },
    });
    if (!etab) return null;

    const parties = composerRegistreParPartie(
      {
        id: etab.id,
        effectifSurSite: etab.effectifSurSite,
        estEtablissementTravail: etab.estEtablissementTravail,
        estERP: etab.estERP,
        estIGH: etab.estIGH,
        estHabitation: etab.estHabitation,
        typeErp: etab.typeErp,
        categorieErp: etab.categorieErp,
        classeIgh: etab.classeIgh,
      familleHabitation: etab.familleHabitation,
        personnesPresentesHabituellement: etab.personnesPresentesHabituellement,
        manipuleMatieresR422722: etab.manipuleMatieresR422722,
        comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
      },
      trierParCategorie(etab.equipements).map((eq) => ({
        id: eq.id,
        libelle: eq.libelle,
        categorie: eq.categorie,
        caracteristiques: null,
      })),
    );

    // Ce que les fiches à saisie libre ont déjà recueilli.
    const contenus: Record<string, ContenuLu> = {};
    const misAJourLe: Record<string, Date> = {};
    for (const f of etab.fichesRegistre) {
      const c = lireContenu(f.contenu);
      contenus[f.sectionId] =
        "lignes" in c
          ? { lignes: lignesDuJournal(f.contenu) }
          : { champs: c.champs };
      misAJourLe[f.sectionId] = f.updatedAt;
    }

    // Les fiches adossées à l'établissement lisent la colonne qui porte la
    // réponse. Une date sort en clé de jour civil (ADR-011) : `cleJourCivil` et
    // non `toISOString()`, sinon une date s'afficherait la veille.
    const jour = (d: Date | null) => (d ? cleJourCivil(d) : null);
    const parSource: Record<string, string | null> = {
      "Etablissement.adresse": etab.adresse,
      "Etablissement.natureActivite": etab.natureActivite,
      "Etablissement.typeErp": etab.typeErp,
      "Etablissement.categorieErp": etab.categorieErp,
      "Etablissement.effectifPublicAdmis":
        etab.effectifPublicAdmis === null ? null : String(etab.effectifPublicAdmis),
      "Etablissement.dateAutorisationOuverture": jour(etab.dateAutorisationOuverture),
      "Etablissement.dateCertificatConformite": jour(etab.dateCertificatConformite),
      "Entreprise.raisonSociale": etab.entreprise.raisonSociale,
      "Entreprise.adresse": etab.entreprise.adresse,
    };

    for (const [sectionId, saisie] of Object.entries(CHAMPS_PAR_SECTION)) {
      if (saisie.forme !== "etablissement") continue;
      contenus[sectionId] = {
        champs: Object.fromEntries(
          saisie.champs.map((c) => [c.cle, parSource[c.source] ?? null]),
        ),
      };
      // Ces fiches n'ont pas de ligne à elles : leur fraîcheur est celle de
      // l'établissement, qui porte les réponses.
      misAJourLe[sectionId] = etab.updatedAt;
    }

    return { parties, contenus, misAJourLe };
  },
);

