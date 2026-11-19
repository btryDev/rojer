import { creerSousPlafond, prendreQuota, rendreQuota } from "@/lib/abonnements/quotas";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { objetAppartientAEtablissement } from "@/lib/signatures/appartenance";
import { PartieSignataire, ScopeAccessToken } from "@prisma/client";
import {
  expirationFromNow,
  generateToken,
  hashToken,
  ttlHoursFor,
} from "./token";
import { envoyerMailAcces, urlAccesPourToken } from "./mail";
import { envoiEnService, motifErreur } from "@/lib/email";
import {
  LIEN_PARTI,
  MOTIF_REVOCATION_ENVOI_ECHOUE,
  MOTIF_REVOCATION_NOUVEAU_LIEN,
  estAUsageUnique,
} from "./revocation";
import { signatureDejaComptee } from "@/lib/plan-prevention/resignature";

/**
 * **Ce module n'est volontairement pas `"use server"`.** `emettreAccessToken`
 * vivait dans `./actions.ts`, donc était un point d'entrée réseau qui
 * acceptait le sujet et le corps du courriel en texte libre : un compte
 * gratuit pouvait envoyer en boucle, depuis l'expéditeur Rojer et à n'importe
 * quelle adresse, un « Facture impayée, cliquez… » portant un lien `/acces/…`
 * légitime. Ici, seul du code serveur l'atteint. Son unique appelant,
 * `demanderSignature`, valide ses entrées et DÉRIVE le texte du courriel de
 * l'objet signé (`@/lib/signatures/libelle-document`).
 *
 * Trois barrières restent ici quand même, parce que c'est le seul endroit par
 * où passe tout envoi de lien et qu'un appelant futur ne les aura pas
 * forcément posées :
 * - la validation des entrées (`emissionSchema`) — adresse valide, longueurs
 *   bornées, aucun saut de ligne dans le sujet ni dans le nom ;
 * - la limite de fréquence, comptée EN BASE (voir plus bas) ;
 * - l'appartenance de l'objet à l'établissement.
 */

// ── Limite de fréquence ────────────────────────────────────────────────────
//
// COMPTÉE EN BASE, SUR LES `AccessToken` ÉMIS DANS L'HEURE. Un compteur en
// mémoire ne survit pas à une fonction serverless : chaque instance aurait
// le sien, et le suivant repartirait de zéro. Chaque lien émis est une ligne
// `AccessToken` avec son `createdAt` — la table EST déjà le journal des
// envois, il suffit de la compter. Aucune migration.
//
// LES SEUILS (décision) :
// - 10 liens par heure et par établissement. Un plan de prévention appelle
//   deux signatures, un permis de feu deux, un rapport une ou deux : une
//   matinée chargée d'une TPE — un plan, deux permis, et deux renvois après
//   une adresse mal tapée — tient sous 10. Au-delà, ce n'est plus l'usage
//   d'un site de moins de cinquante salariés.
// - 20 liens par heure et par utilisateur, tous établissements confondus.
//   Sans ce second plafond, la limite par établissement se contourne en
//   ouvrant des établissements (un compte en tient plusieurs, ADR-028). 20,
//   c'est deux sites au plafond dans la même heure.
//
// Le compte précède l'écriture sans verrou : des demandes simultanées
// peuvent dépasser le seuil du nombre de requêtes parallèles. C'est une
// borne contre l'envoi en boucle, pas un quota facturé ; un verrou n'y
// ajouterait rien qu'on puisse mesurer.
export const LIMITE_LIENS_PAR_ETABLISSEMENT_PAR_HEURE = 10;
export const LIMITE_LIENS_PAR_UTILISATEUR_PAR_HEURE = 20;
const UNE_HEURE_MS = 60 * 60 * 1000;

/** Aucun caractère de contrôle — saut de ligne, retour chariot, tabulation,
 *  NUL… : ils n'ont rien à faire dans un nom ou un sujet, et dans un sujet
 *  ils ouvrent l'injection d'en-tête. */
const SANS_CONTROLE = /^[^\p{Cc}]*$/u;

export const emissionSchema = z.object({
  etablissementId: z.string().min(1).max(100),
  scope: z.enum(ScopeAccessToken),
  objetType: z.string().min(1).max(64),
  objetId: z.string().min(1).max(100),
  emailDestinataire: z.string().trim().toLowerCase().email().max(254),
  nomDestinataire: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(SANS_CONTROLE)
    .optional(),
  // La partie invitée à signer (2026-10-12), recopiée sur la signature.
  partie: z.enum(PartieSignataire).optional(),
  sujetMail: z.string().trim().min(1).max(200).regex(SANS_CONTROLE),
  // Les paragraphes du message, séparés par une ligne vide.
  messageMail: z.string().trim().min(1).max(2000),
  // La mise en page du courriel (2026-11-19) : titre, encadré, libellé du
  // bouton. Facultatifs ; chaque valeur tient sur une ligne.
  titreMail: z.string().trim().min(1).max(120).regex(SANS_CONTROLE).optional(),
  boutonMail: z.string().trim().min(1).max(60).regex(SANS_CONTROLE).optional(),
  encadreMail: z
    .array(
      z.object({
        libelle: z.string().trim().min(1).max(40).regex(SANS_CONTROLE),
        valeur: z.string().trim().min(1).max(300).regex(SANS_CONTROLE),
      }),
    )
    .max(6)
    .optional(),
});

/**
 * Émet un token d'accès externe et envoie par email le lien magique au
 * destinataire. ~~(+ OTP si scope = signature ou depot_rapport)~~
 * [2026-11-19 : le code part à la demande, par un second courriel —
 * `renvoyerCodeOtp`.]
 *
 * ── Ni le lien ni le code ne reviennent à l'appelant ─────────────────────
 *
 * Les deux facteurs n'existent qu'à deux endroits : leurs empreintes en base,
 * et le message adressé au destinataire. Aucun des deux ne figure dans ce
 * retour, et c'est leur absence du **type** `EmissionResultat` qui le tient :
 * un champ mis à `null` se remet à la première occasion, un champ retiré fait
 * échouer la compilation de qui le lit.
 *
 * Ce retour valait auparavant `otpClair: otp`, sans condition, en plus du
 * lien. Or c'est une server action, appelée depuis le navigateur du
 * demandeur : le code remontait donc à celui-là même dont la signature du
 * tiers doit être indépendante. Un demandeur tenant les deux facteurs signe
 * lui-même à la place du signataire, et il en sort une `Signature`
 * `otp_email` qu'un `/verifier/<id>` public confirme. La séparation des
 * canaux — lien et code ne partent qu'à la boîte du destinataire — était la
 * seule chose qui distinguait cette signature d'une case cochée par le
 * donneur d'ordre.
 *
 * Le lien seul ne signe pas, il lui manque le code : le rendre était donc une
 * fuite moindre, pas une fuite nulle. Il sort quand même, et pour une raison
 * qui vaut d'être retenue — « un reliquat de debug qui sert accessoirement un
 * besoin produit » est exactement la forme qu'avait `otpClair`, et c'est
 * cette ambiguïté qui l'a fait survivre. On ne la reconduit pas d'un cran.
 *
 * ── Ce que ce retrait emporte, et par où ça doit revenir ─────────────────
 *
 * La copie manuelle du lien disparaît : un demandeur dont le courriel rebondit
 * n'a plus de recours depuis cet écran. Le besoin est réel et il est reconnu —
 * mais il doit revenir par un chemin nommé et tracé, un « renvoyer le lien »
 * visible, décidé pour lui-même. **Il ne revient pas en remettant une valeur
 * dans ce retour.** Qui lira ce code plus tard et croira réparer un oubli
 * lira d'abord ce paragraphe.
 *
 * Le besoin d'essayer le flux en local, lui, est entier et servi : sans SMTP
 * aucun message ne part, et `/dev/boite-mail` donne à lire le message tel que
 * le destinataire le recevrait — les deux facteurs ensemble, au même endroit
 * que lui. Voir `src/lib/email/dev-outbox.ts`, y compris pour ce qui rend
 * cette page impossible à atteindre en production.
 *
 * Ce qui reste rendu ne porte aucun secret : l'identifiant de l'`AccessToken`
 * (qui n'autorise rien — c'est l'empreinte du jeton clair qui fait foi) et la
 * fin de validité du lien.
 */

/**
 * ~~`prestataireId`~~ — retiré le 2026-10-13 (revue de
 * `lot/audit-1013-perimetre`) : accepté ici, écrit sur le jeton, vérifié
 * nulle part — un identifiant de prestataire d'un autre client se serait
 * écrit tel quel — et passé par aucun appelant ni lu par personne. La colonne
 * `AccessToken.prestataireId` reste en base (aucune migration) ; un besoin
 * futur la remettra avec sa vérification d'appartenance.
 */
export type EmissionTokenParams = {
  etablissementId: string;
  scope: ScopeAccessToken;
  objetType: string;
  objetId: string;
  emailDestinataire: string;
  nomDestinataire?: string;
  partie?: PartieSignataire;
  sujetMail: string;
  messageMail: string;
  titreMail?: string;
  boutonMail?: string;
  encadreMail?: { libelle: string; valeur: string }[];
};

export type EmissionResultat =
  | { ok: true; accessTokenId: string; expireLe: Date }
  | {
      ok: false;
      raison: "frequence" | "envoi_hors_service" | "envoi_echoue" | "plafond";
      message: string;
    };

/**
 * Ce que le demandeur lit quand l'envoi n'est pas en service. Vrai à la
 * lettre : le refus arrive avant la création du jeton.
 */
export const MESSAGE_ENVOI_HORS_SERVICE =
  "La demande n'a pas été envoyée : l'envoi d'e-mails n'est pas encore en service dans Rojer. Aucun lien n'a été créé.";

/**
 * Ce que le demandeur lit quand l'envoi est parti en erreur (fournisseur
 * injoignable, refus). Vrai à la lettre : le lien créé est révoqué aussitôt,
 * il ne pourra pas servir même si le message finissait par arriver.
 */
export const MESSAGE_ENVOI_ECHOUE =
  "La demande n'a pas été envoyée : l'e-mail n'a pas pu partir. Le lien préparé a été annulé. Réessayez dans quelques minutes.";

export async function emettreAccessToken(
  entree: EmissionTokenParams,
): Promise<EmissionResultat> {
  // `parse` et non `safeParse` : l'appelant légitime a déjà validé, une
  // entrée invalide ici est une faute de programmation, pas une saisie.
  const params = emissionSchema.parse(entree);
  // Une seule lecture de la session : la garde rend l'utilisateur et le
  // client borné.
  const { user, compte, db } = await assertEtablissementDuCompte(params.etablissementId);

  // `etablissementId` et `objetId` arrivent du même appel, et jusqu'ici rien
  // ne vérifiait qu'ils avaient un rapport entre eux : posséder son propre
  // établissement suffisait à faire émettre un jeton désignant le document
  // d'un autre client. C'est une server action, donc un point d'entrée
  // réseau — ces paramètres ne sont pas ceux qu'un formulaire a envoyés, ce
  // sont ceux que l'appelant a choisis.
  //
  // Le refus arrive avant la moindre écriture et avant le moindre envoi : ni
  // jeton en base, ni mail parti, ni code émis.
  if (
    !(await objetAppartientAEtablissement(
      db,
      params.objetType,
      params.objetId,
      params.etablissementId,
    ))
  ) {
    notFound();
  }

  // ~~Le jeton créé, puis l'envoi qui lève~~ (C38, 2026-09-26) : en
  // production, sans driver réel, chaque demande laissait un jeton orphelin et
  // rendait l'erreur générique de Next. L'envoi se sait hors service AVANT
  // toute écriture.
  if (!envoiEnService()) {
    return { ok: false, raison: "envoi_hors_service", message: MESSAGE_ENVOI_HORS_SERVICE };
  }

  // Limite de fréquence, avant toute écriture et tout envoi.
  const depuis = new Date(Date.now() - UNE_HEURE_MS);
  // Un lien dont l'e-mail n'est jamais parti ne compte pas (`LIEN_PARTI`).
  const [parEtablissement, parUtilisateur] = await Promise.all([
    db.accessToken.count({
      where: {
        etablissementId: params.etablissementId,
        createdAt: { gte: depuis },
        ...LIEN_PARTI,
      },
    }),
    db.accessToken.count({
      where: { createdByUserId: user.id, createdAt: { gte: depuis }, ...LIEN_PARTI },
    }),
  ]);
  if (
    parEtablissement >= LIMITE_LIENS_PAR_ETABLISSEMENT_PAR_HEURE ||
    parUtilisateur >= LIMITE_LIENS_PAR_UTILISATEUR_PAR_HEURE
  ) {
    return {
      ok: false,
      raison: "frequence",
      message:
        "Trop de liens envoyés dans l'heure. Réessayez un peu plus tard.",
    };
  }

  const token = generateToken();
  // L'URL avant toute écriture (2026-10-12, audit B7) : en production sans
  // adresse publique, `publicAppUrl` lève — avant qu'un jeton soit créé pour
  // un lien qui pointerait vers localhost.
  const urlAcces = urlAccesPourToken(token);
  const tokenHash = hashToken(token);
  const ttl = ttlHoursFor(params.scope);
  const expireLe = expirationFromNow(ttl, new Date());

  // Aucun code à l'émission (2026-11-19) : le code part à la demande, depuis
  // la page du lien, par un second courriel (`renvoyerCodeOtp`). Il voyageait
  // avec le lien et n'en prouvait rien de plus ; ses 10 minutes couraient
  // avant même que le destinataire ouvre sa boîte. `otpHash` et
  // `otpExpireLe` restent nuls jusqu'à la première demande.

  // Plafonds de la formule (ADR-053 § 14) : les liens actifs, et pour une
  // demande de signature, les signatures de l'année — comptées à la demande,
  // comme une enveloppe : la signature du tiers, plus tard, ne recompte pas.
  let pris: string[] = [];
  const creation = await creerSousPlafond(db, compte.compteId, "liensAccesActifs", async (tx) => {
    // Une re-signature après correction ne compte pas (ADR-061 § 6).
    if (params.scope === "signature" && !(await signatureDejaComptee(tx, { ...params, email: params.emailDestinataire })))
      pris = await prendreQuota(tx, compte.compteId, "signaturesParAn");
    return tx.accessToken.create({
      data: {
        id: `atk_${randomUUID()}`,
        tokenHash,
        etablissementId: params.etablissementId,
        scope: params.scope,
        objetType: params.objetType,
        objetId: params.objetId,
        partie: params.partie,
        emailDestinataire: params.emailDestinataire,
        nomDestinataire: params.nomDestinataire,
        expireLe,
        createdByUserId: user.id,
      },
    });
  });
  if (!creation.ok) return { ok: false, raison: "plafond", message: creation.motif };
  const access = creation.valeur;

  try {
    await envoyerMailAcces({
      to: params.emailDestinataire,
      nom: params.nomDestinataire,
      sujet: params.sujetMail,
      message: params.messageMail,
      titre: params.titreMail,
      bouton: params.boutonMail,
      encadre: params.encadreMail,
      urlAcces,
      codeALaDemande: estAUsageUnique(params.scope),
      expireLe,
    });
  } catch (erreur) {
    // Le jeton existe mais son e-mail n'est pas parti : il est révoqué, pas
    // supprimé — la trace dit qu'une demande a eu lieu et pourquoi elle n'a
    // pas abouti. Si la révocation échoue aussi (base indisponible), le jeton
    // reste, mais son secret n'est ni parti ni rendu : il ne sert à personne.
    // Le journal porte les deux causes, jamais l'adresse ni le contenu.
    const revoque = await db.accessToken
      .update({
        where: { id: access.id },
        data: { revoqueLe: new Date(), revoqueMotif: MOTIF_REVOCATION_ENVOI_ECHOUE },
      })
      .then(
        () => "révoqué",
        (e: unknown) => `révocation impossible (${motifErreur(e)})`,
      );
    // La signature prise pour cette demande est rendue, si le lien est bien
    // révoqué : rien n'a atteint personne (même règle que `LIEN_PARTI`). Non
    // révoqué, le lien a pu partir (délai dépassé, e-mail accepté) : elle reste.
    if (revoque === "révoqué")
      await rendreQuota(db, pris).catch((e: unknown) => console.error("[access-tokens] signature non rendue :", motifErreur(e)));
    console.error(`[access-tokens] envoi échoué, jeton ${access.id} ${revoque} :`, motifErreur(erreur));
    return { ok: false, raison: "envoi_echoue", message: MESSAGE_ENVOI_ECHOUE };
  }

  // Un seul lien ouvert par partie et par objet (2026-11-19, cahier de
  // reprise § 8.6) : le nouveau lien PARTI, l'ancien lien encore ouvert de la
  // même partie est révoqué, quelle que soit l'adresse qui l'avait reçu.
  // APRÈS l'envoi, jamais avant : un envoi échoué ne retire rien à personne,
  // et rien n'a à être rétabli (un lien rétabli aurait pu entre-temps devenir
  // obsolète — plan modifié, clos, proposition). Conditionnelle : un lien
  // consommé garde sa trace « utilisé », une révocation antérieure son motif.
  // Sans partie (un rapport), rien ne dit que deux liens visent la même
  // personne : rien n'est révoqué. Les plafonds ne changent pas.
  //
  // Seuls les liens créés AVANT celui-ci (`createdAt`, l'horloge de la base
  // pour les deux côtés) : deux envois simultanés à la même partie ne se
  // révoquent pas l'un l'autre — le plus récent reste valable, au pire les
  // deux.
  //
  // Un échec ici ne défait pas l'envoi réussi : il se journalise, et
  // l'ancien lien reste valable à côté du nouveau (même partie, même objet).
  // C'est acceptable : aucun lien obsolète n'est remis en service — l'ancien
  // n'a jamais cessé de l'être —, et la garde de fond reste
  // `objetEstSignable` au moment de signer, avec la révocation à chaque
  // modification, clôture ou annulation (`revoquerLiensEnVol`). C'est l'état
  // d'avant le 2026-11-19, où les liens d'une partie s'empilaient.
  if (params.partie) {
    await db.accessToken
      .updateMany({
        where: {
          etablissementId: params.etablissementId,
          objetType: params.objetType,
          objetId: params.objetId,
          scope: params.scope,
          partie: params.partie,
          id: { not: access.id },
          createdAt: { lt: access.createdAt },
          revoqueLe: null,
          utiliseLe: null,
        },
        data: { revoqueLe: new Date(), revoqueMotif: MOTIF_REVOCATION_NOUVEAU_LIEN },
      })
      .catch((e: unknown) => console.error("[access-tokens] ancien lien non révoqué :", motifErreur(e)));
  }

  return {
    ok: true,
    accessTokenId: access.id,
    expireLe,
  };
}
