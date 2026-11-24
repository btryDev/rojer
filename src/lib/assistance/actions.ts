"use server";

import { headers } from "next/headers";
import { requireCompte } from "@/lib/auth/compte";
import { ouvrirAuGel } from "@/lib/abonnements/gel-saisie";
import { z } from "zod";
import { requireEtablissement } from "@/lib/auth/scope";
import { decouperCheminInterne } from "@/lib/navigation/provenance";
import { envoiEnService, motifErreur, sendMail } from "@/lib/email";
import { CONTACT, ENVOI_IMPOSSIBLE } from "@/lib/contact/message";
import { LIMITES, cleLimite, consommer } from "@/lib/securite/limite-debit";
import { texteSaisi } from "@/lib/validation/texte";
import { courrielDAssistance } from "./courriel";
import { formuleDAssistance } from "./formule";
import {
  CATEGORIES_ASSISTANCE,
  CONTEXTE_MAX,
  MESSAGE_FORMULE_PRO,
  MESSAGE_MAX,
  TOUT_LE_COMPTE,
  estUnSujetDeLApplication,
  exigeLaFormulePro,
} from "./libelles";

export type DemandeAssistanceState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Un champ caché, né des données de la page : il se tronque, jamais ne
 * refuse — l'utilisateur ne pourrait rien y corriger (revue du 2026-10-24).
 */
const tronque = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined),
    z.string().optional(),
  );

const schema = z.object({
  categorie: z.enum(CATEGORIES_ASSISTANCE),
  // `texteSaisi` compte un retour à la ligne pour un caractère, comme le
  // champ du navigateur (`maxLength`).
  message: texteSaisi(MESSAGE_MAX, `Votre message tient en ${MESSAGE_MAX} caractères au plus.`).min(
    1,
    "Écrivez votre question en quelques mots",
  ),
  contexte: tronque(CONTEXTE_MAX),
  page: z.preprocess((v) => (typeof v === "string" && v.length <= 512 ? v : ""), z.string()),
  etablissementId: tronque(64),
});

/**
 * Envoie une demande d'assistance à la boîte de Rojer, par e-mail, et la
 * garde en base (ADR-050, amendée le 2026-11-24). La réponse se fait par
 * e-mail, à l'adresse de la personne. Les questions de prévention demandent
 * la formule Pro ; l'établissement, s'il est donné, doit être celui du
 * compte ; la page n'est gardée que si c'est un chemin de ce site.
 */
export async function demanderAssistance(
  _prev: DemandeAssistanceState,
  formData: FormData,
): Promise<DemandeAssistanceState> {
  const { user, compte, db } = await requireCompte();
  ouvrirAuGel(); // supprimer, retirer, demander de l'aide : ouvert sur un site gelé (ADR-053 § 14)
  const parsed = schema.safeParse({
    categorie: formData.get("categorie"),
    message: formData.get("message"),
    contexte: formData.get("contexte"),
    page: formData.get("page") ?? "",
    etablissementId: formData.get("etablissementId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Formulaire invalide", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  // L'établissement choisi, à défaut celui de la page (« /etablissements/{id}/… ») ;
  // « Tout le compte » n'en retient aucun. 404 pour celui d'un autre compte.
  const chemin = decouperCheminInterne(d.page);
  const page = chemin?.pathname ?? "";
  const deLaPage = /^\/etablissements\/([^/]+)/.exec(page)?.[1];
  const voulu =
    d.etablissementId === TOUT_LE_COMPTE
      ? undefined
      : (d.etablissementId ?? (deLaPage && deLaPage !== "nouveau" ? deLaPage : undefined));

  // Deux lectures indépendantes, ensemble (revue du 2026-11-24).
  const [formule, garde] = await Promise.all([
    formuleDAssistance(db, compte.compteId),
    voulu ? requireEtablissement(voulu) : null,
  ]);
  const etablissement = garde?.etablissement ?? null;
  if (exigeLaFormulePro(d.categorie) && !formule.pro) return { status: "error", message: MESSAGE_FORMULE_PRO };
  // Le plafond du jour, par le compteur atomique (`LIMITES.assistanceCompte`) :
  // compter les demandes puis écrire laissait passer des envois simultanés
  // (revue de sécurité du commit, 2026-11-24).
  const verdict = await consommer([
    { cle: cleLimite("assistance", "compte", compte.compteId), limite: LIMITES.assistanceCompte },
  ]);
  if (!verdict.ok) {
    return {
      status: "error",
      message: "Vos demandes du jour sont bien arrivées : nous vous répondons par e-mail.",
    };
  }

  if (!user.email || !envoiEnService()) return { status: "error", message: ENVOI_IMPOSSIBLE };

  // La ligne d'abord : elle compte au plafond du jour dès maintenant, même
  // si deux envois partent ensemble (revue du 2026-11-24). Le téléphone n'est
  // plus demandé (2026-11-24).
  const contexte = d.contexte ?? null;
  const demande = await db.demandeAssistance.create({
    data: {
      compteId: compte.compteId,
      userId: user.id,
      etablissementId: etablissement?.id ?? null,
      categorie: d.categorie,
      message: d.message,
      contexte,
      page,
    },
    select: { id: true },
  });

  const courriel = courrielDAssistance({
    categorie: d.categorie,
    message: d.message,
    contexte,
    page,
    formule: formule.libelle,
    personne: { nom: user.name ?? null, email: user.email },
    etablissement: etablissement?.raisonDisplay ?? null,
    compteId: compte.compteId,
    // Le navigateur, pour un problème technique seulement : c'est ce que
    // l'écran et la politique de confidentialité annoncent.
    navigateur: estUnSujetDeLApplication(d.categorie)
      ? ((await headers()).get("user-agent")?.slice(0, 300) ?? null)
      : null,
  });
  try {
    await sendMail({ to: CONTACT, replyTo: user.email, ...courriel });
  } catch (e) {
    console.error(`[assistance] demande non envoyée : ${motifErreur(e)}`);
    // Partie nulle part : la ligne s'en va, et l'essai suivant repart à neuf.
    // Un membre en lecture seule ne peut que créer (ADR-054) : sa ligne reste.
    await db.demandeAssistance.delete({ where: { id: demande.id } }).catch(() => {});
    return { status: "error", message: ENVOI_IMPOSSIBLE };
  }
  return { status: "success", email: user.email };
}
