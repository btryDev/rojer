import { prisma } from "@/lib/prisma";
import { formaterDateFr } from "@/lib/dates";

/**
 * Le nom du document à signer, tel qu'il part dans le sujet et le corps du
 * courriel de demande de signature — DÉRIVÉ CÔTÉ SERVEUR de l'objet signé.
 *
 * **Ce module n'est volontairement pas `"use server"`** (voir
 * `./appartenance.ts`).
 *
 * Le libellé arrivait du navigateur (`libelleDocument`) et partait tel quel
 * dans le sujet du courriel, depuis l'expéditeur Rojer : n'importe quel
 * compte choisissait le texte d'un message envoyé en notre nom. Il se lit
 * désormais sur l'objet, dont l'appartenance à l'établissement est établie
 * par la même lecture — bornée à `etablissementId`, un objet d'ailleurs rend
 * `null`.
 *
 * Il reste du texte saisi par l'utilisateur dans le libellé (raison sociale
 * de l'entreprise extérieure, de l'intervenant) : ce texte est encadré par un
 * préfixe fixe, réduit à une seule ligne et borné en longueur. Le préfixe dit
 * ce qu'est le document ; la limite de fréquence (`@/lib/access-tokens/
 * emission`) borne le reste.
 */
const LONGUEUR_MAX = 150;

function uneLigne(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();
  return plat.length > LONGUEUR_MAX ? `${plat.slice(0, LONGUEUR_MAX - 1)}…` : plat;
}

function numero(prefixe: string, n: number): string {
  return `${prefixe}-${String(n).padStart(3, "0")}`;
}

export async function libelleDocumentSignable(
  objetType: string,
  objetId: string,
  etablissementId: string,
): Promise<string | null> {
  if (!objetId || !etablissementId) return null;

  if (objetType === "rapport_verification") {
    const r = await prisma.rapportVerification.findFirst({
      where: { id: objetId, etablissementId },
      select: {
        dateRapport: true,
        verification: { select: { libelleObligation: true } },
      },
    });
    return r
      ? uneLigne(
          `${r.verification.libelleObligation} — rapport du ${formaterDateFr(r.dateRapport)}`,
        )
      : null;
  }

  if (objetType === "plan_prevention") {
    const p = await prisma.planPrevention.findFirst({
      where: { id: objetId, etablissementId },
      select: { numero: true, entrepriseExterieureRaison: true },
    });
    return p
      ? uneLigne(
          `Plan de prévention ${numero("PP", p.numero)} — ${p.entrepriseExterieureRaison}`,
        )
      : null;
  }

  if (objetType === "permis_feu") {
    const p = await prisma.permisFeu.findFirst({
      where: { id: objetId, etablissementId },
      select: { numero: true, prestataireRaison: true },
    });
    return p
      ? uneLigne(`Permis de feu ${numero("PF", p.numero)} — ${p.prestataireRaison}`)
      : null;
  }

  return null;
}
