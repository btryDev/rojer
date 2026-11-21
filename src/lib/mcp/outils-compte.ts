import "server-only";
// Les outils servis à un porteur OAuth (ADR-062 § 5) : un compte, qui tient
// jusqu'à cinq établissements (formule Pro).
//
// - `etablissements` liste ceux du compte ;
// - chaque outil de `./tools` reçoit un argument `etablissement`
//   facultatif : absent et un seul établissement, celui-là ; absent et
//   plusieurs, la liste et la question ; présent, il doit être l'un de ceux
//   du compte, sinon « introuvable » — sans dire s'il existe ailleurs.
//
// La garantie ne tient pas à ce choix : la lecture passe par le client borné
// au compte ET à l'établissement (`clientDuPorteurMcp`), en lecture seule. Un
// identifiant d'un autre compte n'y désigne rien.
//
// Hors formule Pro (`porteur.ouvert` faux), aucun outil ne lit rien : tous
// répondent par le message de la formule.

import { z } from "zod";
import { clientDuPorteurMcp } from "@/lib/auth/compte-hors-session";
import { MESSAGE_CONNECTEUR_PRO } from "@/lib/abonnements/connecteur";
import type { PorteurMcp } from "./acces-compte";
import { ErreurOutilMcp, OUTILS_MCP, MESSAGE_ETABLISSEMENT_INTROUVABLE, type ContexteMcp } from "./tools";

/** Un outil servi au porteur : il reçoit le porteur, pas un contexte d'établissement. */
export type OutilServi = {
  nom: string;
  titre: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  executer: (porteur: PorteurMcp, args: Record<string, unknown>, now: Date) => Promise<string>;
};

type EtablissementLu = { id: string; nom: string; adresse: string };

/** Les établissements du compte, par nom. Borné au compte ; rien d'autre n'est lu. */
async function etablissementsDuCompte(porteur: PorteurMcp): Promise<EtablissementLu[]> {
  const db = clientDuPorteurMcp(porteur.compteId, porteur.userId);
  const lignes = await db.etablissement.findMany({
    select: { id: true, raisonDisplay: true, adresse: true },
    orderBy: [{ raisonDisplay: "asc" }, { id: "asc" }],
  });
  return lignes.map((l) => ({ id: l.id, nom: l.raisonDisplay, adresse: l.adresse }));
}

const ligneEtablissement = (e: EtablissementLu) => `• ${e.nom} — ${e.adresse} (identifiant : ${e.id})`;

function formaterListe(etabs: EtablissementLu[]): string {
  if (etabs.length === 0) return "Ce compte ne suit encore aucun établissement.";
  return [`${etabs.length} établissement(s) suivi(s) par ce compte :`, "", ...etabs.map(ligneEtablissement)].join("\n");
}

/** L'établissement que vise un appel : désigné, ou le seul du compte. */
export function choisirEtablissement(etabs: EtablissementLu[], designe: string | undefined): EtablissementLu {
  if (designe !== undefined) {
    const trouve = etabs.find((e) => e.id === designe);
    if (!trouve) throw new ErreurOutilMcp(MESSAGE_ETABLISSEMENT_INTROUVABLE);
    return trouve;
  }
  if (etabs.length === 1) return etabs[0];
  if (etabs.length === 0) throw new ErreurOutilMcp("Ce compte ne suit encore aucun établissement.");
  throw new ErreurOutilMcp(
    [
      "Ce compte suit plusieurs établissements : précisez lequel avec l'argument `etablissement`.",
      "",
      ...etabs.map(ligneEtablissement),
    ].join("\n"),
  );
}

const ARG_ETABLISSEMENT = z
  .string()
  .min(1)
  .max(64)
  .optional()
  .describe(
    "Identifiant de l'établissement visé, tel que rendu par l'outil `etablissements`. Facultatif quand le compte n'en suit qu'un.",
  );

const outilEtablissements: OutilServi = {
  nom: "etablissements",
  titre: "Établissements du compte",
  description:
    "Liste des établissements que suit ce compte Rojer : nom, adresse et identifiant. À appeler en premier quand le compte en suit plusieurs, pour passer l'identifiant voulu aux autres outils (argument `etablissement`).",
  schema: z.object({}).strict(),
  executer: async (porteur) => formaterListe(await etablissementsDuCompte(porteur)),
};

/** Un outil d'établissement, servi au porteur : choix de l'établissement, puis l'outil d'origine. */
function pourLePorteur(outil: (typeof OUTILS_MCP)[number]): OutilServi {
  const schema = (outil.schema as z.ZodObject<z.ZodRawShape>).extend({ etablissement: ARG_ETABLISSEMENT });
  return {
    nom: outil.nom,
    titre: outil.titre,
    description: outil.description,
    schema,
    executer: async (porteur, args, now) => {
      const { etablissement, ...reste } = args as { etablissement?: string } & Record<string, unknown>;
      // L'établissement est choisi dans la liste du compte AVANT toute
      // lecture : un identifiant d'un autre compte est refusé ici, en plus du
      // client borné (deux remparts, pour une petite requête de plus).
      const cible = choisirEtablissement(await etablissementsDuCompte(porteur), etablissement);
      const ctx: ContexteMcp = {
        scope: { etablissementId: cible.id },
        now,
        db: clientDuPorteurMcp(porteur.compteId, porteur.userId, cible.id),
      };
      return outil.executer(ctx, reste);
    },
  };
}

/** Hors formule Pro : même liste d'outils, aucun ne lit. */
function fermeHorsPro(outil: OutilServi): OutilServi {
  return {
    ...outil,
    executer: async (porteur, args, now) => {
      if (!porteur.ouvert) throw new ErreurOutilMcp(MESSAGE_CONNECTEUR_PRO);
      return outil.executer(porteur, args, now);
    },
  };
}

export const OUTILS_COMPTE: readonly OutilServi[] = [outilEtablissements, ...OUTILS_MCP.map(pourLePorteur)].map(
  fermeHorsPro,
);
