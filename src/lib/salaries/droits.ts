import { prisma } from "@/lib/prisma";
import { titreParId } from "./catalogue";
import { formaterDateLongueFr } from "@/lib/dates";

/**
 * Les droits du salarié suivi — art. 13 et 15 du RGPD.
 *
 * Ce module existe parce que la personne dont les données sont traitées **n'a
 * pas accès à l'outil**. Ses droits s'exercent auprès de son employeur, qui
 * est le responsable de traitement. L'outil ne peut pas informer à sa place ni
 * répondre à sa place : il lui donne de quoi le faire.
 *
 * `docs/rgpd.md` § 5.2 les énumère, et son § 5.3 disait qu'ils n'étaient pas
 * livrés — « dus dès que des salariés réels sont saisis ». L'écran Équipe est
 * précisément ce qui rend possible d'en saisir un : les deux partent ensemble,
 * plutôt qu'une porte fermée qu'on oublierait de rouvrir.
 */

/**
 * Tout ce que l'outil détient sur une personne (art. 15, droit d'accès).
 *
 * « Tout » est court, et c'est le résultat d'un choix : le schéma ne collecte
 * que l'identité et les dates. Un export qui tient en dix lignes est la preuve
 * que la minimisation a été tenue, pas un export incomplet.
 */
export async function exporterDonneesSalarie(
  etablissementId: string,
  salarieId: string,
) {
  const s = await prisma.salarie.findFirst({
    where: { id: salarieId, etablissementId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      poste: true,
      entreLe: true,
      actif: true,
      createdAt: true,
      updatedAt: true,
      etablissement: { select: { raisonDisplay: true } },
      titres: {
        select: {
          obligationId: true,
          delivreLe: true,
          echeanceLe: true,
          note: true,
          createdAt: true,
        },
        orderBy: { delivreLe: "desc" },
      },
    },
  });
  if (!s) return null;

  return {
    aPropos: {
      objet:
        "Données détenues par l'employeur dans Rojer concernant la personne nommée ci-dessous.",
      etabliLe: new Date().toISOString(),
      responsableDeTraitement: s.etablissement.raisonDisplay,
      baseLegale:
        "Article 6.1.c du RGPD — obligation légale de l'employeur (suivi des titres et habilitations exigés par le Code du travail). Le consentement n'est pas la base légale retenue : il ne serait pas libre en situation de subordination.",
      cequiNestPasIci:
        "Rojer ne détient aucune donnée de santé. Sur une attestation ou une visite médicale — visite d'information et de prévention, suivi individuel renforcé, visite intermédiaire, attestation d'absence de contre-indication —, il n'enregistre que son existence et ses dates : ni motif, ni avis d'aptitude, ni restriction, ni document. Le dossier médical en santé au travail appartient au service de prévention et n'est pas accessible à l'employeur (L. 4624-8, R. 4624-55).",
    },
    identite: {
      nom: s.nom,
      prenom: s.prenom,
      poste: s.poste,
      entreeDansLEffectif: s.entreLe?.toISOString().slice(0, 10) ?? null,
      presentDansLEffectif: s.actif,
    },
    titres: s.titres.map((t) => ({
      titre: titreParId(t.obligationId)?.libelle ?? t.obligationId,
      identifiantAuReferentiel: t.obligationId,
      delivreLe: t.delivreLe.toISOString().slice(0, 10),
      valableJusquAu: t.echeanceLe?.toISOString().slice(0, 10) ?? null,
      repereSaisiParLEmployeur: t.note,
      enregistreLe: t.createdAt.toISOString(),
    })),
    conservation: {
      regle:
        "Les titres sont conservés cinq ans — la durée que l'article D. 4711-3 fixe pour les documents des vérifications et contrôles, reprise par analogie : l'article ne vise pas les titres eux-mêmes —, et au-delà tant qu'ils servent de preuve d'habilitation sur une période travaillée.",
      effacement:
        "Le droit à l'effacement est limité sur ces données : l'article 17.3.b du RGPD excepte ce qui est conservé au titre d'une obligation légale. Une sortie de l'effectif ne les efface donc pas.",
      opposition:
        "Le droit d'opposition (art. 21) est sans objet sur un traitement fondé sur une obligation légale.",
    },
    ficheCreeeLe: s.createdAt.toISOString(),
    derniereModification: s.updatedAt.toISOString(),
  };
}

/**
 * Le texte d'information (art. 13) que l'employeur remet à ses salariés.
 *
 * Il est rédigé à la deuxième personne et sans jargon : il s'adresse à une
 * personne qui n'a pas demandé à être dans un logiciel, et à qui on doit une
 * explication, pas une notice juridique. Les articles sont cités parce qu'ils
 * fondent ce qui est dit, pas pour faire sérieux.
 *
 * L'outil le fournit ; il n'informe pas à la place de l'employeur.
 */
export function texteInformation({
  raisonSociale,
  titresSuivis,
}: {
  raisonSociale: string;
  titresSuivis: string[];
}): string {
  const liste =
    titresSuivis.length > 0
      ? titresSuivis.map((t) => `  — ${t}`).join("\n")
      : "  — (aucun titre suivi pour l'instant)";

  return `Information sur le suivi de vos titres et habilitations

${raisonSociale} utilise un outil, Rojer, pour suivre les échéances des titres
que vous détenez et que la réglementation lui impose de connaître.

CE QUI EST ENREGISTRÉ

  — votre nom et votre prénom ;
  — votre poste, si vous en avez communiqué un ;
  — votre date d'entrée dans l'effectif ;
  — pour chaque titre : sa nature, sa date de délivrance et sa date de fin de
    validité, ainsi qu'un repère éventuel (organisme, niveau, numéro).

Titres suivis à ce jour :
${liste}

CE QUI N'EST PAS ENREGISTRÉ

Aucune donnée de santé. Si l'un de vos titres est une attestation médicale ou
une visite auprès du service de santé au travail — visite d'information et de
prévention, suivi individuel renforcé, visite intermédiaire —, seules son
existence et ses dates sont enregistrées : jamais son motif, jamais l'avis
d'aptitude ou d'inaptitude, jamais une restriction, jamais le document
lui-même. Votre dossier médical en santé au travail appartient au service de
prévention et n'est pas accessible à votre employeur (art. L. 4624-8 et
R. 4624-55 du Code du travail).

POURQUOI

Parce que la loi l'impose à votre employeur. Certains travaux ne peuvent être
confiés qu'à une personne titulaire d'un titre en cours de validité, et
l'employeur doit pouvoir en justifier. La base légale de ce traitement est
l'article 6.1.c du RGPD — une obligation légale.

Ce n'est donc pas un traitement fondé sur votre consentement, et il ne peut pas
l'être : un consentement donné à son employeur n'est pas considéré comme libre.

COMBIEN DE TEMPS

Vos titres sont conservés cinq ans, et au-delà tant qu'ils prouvent que vous
étiez habilité pendant une période où vous avez travaillé. Cinq ans, c'est la
durée que l'article D. 4711-3 du Code du travail fixe pour les documents des
vérifications et contrôles ; elle est reprise ici par analogie, cet article ne
visant pas les titres eux-mêmes.

Votre départ de l'entreprise n'efface donc pas ces données. Votre fiche est
marquée comme sortie de l'effectif, et les titres restent.

VOS DROITS

  — Accès : vous pouvez demander à votre employeur la liste de ce qui est
    enregistré vous concernant. Il peut vous l'éditer en un clic.
  — Rectification : une date erronée se corrige, demandez-la.
  — Effacement : limité sur ces données. L'article 17.3.b du RGPD excepte ce
    qui est conservé au titre d'une obligation légale. Nous préférons vous le
    dire que vous promettre un droit que nous ne pourrions pas honorer.
  — Opposition : sans objet ici. Le droit d'opposition ne s'applique pas à un
    traitement fondé sur une obligation légale, pas plus qu'on ne peut
    s'opposer à l'établissement de son bulletin de paie.

À QUI VOUS ADRESSER

À ${raisonSociale}, qui est responsable de ce traitement. Vous pouvez aussi
saisir la CNIL (www.cnil.fr) si vous estimez que vos droits ne sont pas
respectés.

Document établi le ${formaterDateLongueFr(new Date())}.
`;
}
