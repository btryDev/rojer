import Link from "next/link";
// `Building2` nommait déjà « Mon établissement » dans le rail et sur la
// page publique : une entreprise tierce ne peut pas porter le glyphe de son
// propre site (charte, interdit 9). `Handshake` dit la relation contractuelle.
import { Handshake } from "lucide-react";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import { LABEL_DOMAINE } from "@/lib/prestataires/schema";
import { mentionUrssaf } from "@/lib/prestataires/vigilance";
import type { PrestataireAvecVigilance } from "@/lib/prestataires/queries";
import { VigilancePiecePill } from "./VigilancePills";

/**
 * La carte d'un prestataire, en charte board (`docs/charte-board.md`).
 *
 * Elle était en charte papier — `cartouche`, `label-admin`,
 * `filet-pointille`, `--minium`, `--seal`, `--paper-sunk`. Le module est
 * pourtant l'annuaire de référence du produit, celui qu'on copie pour en
 * écrire un autre : le laisser en papier, c'était propager la dette à chaque
 * annuaire suivant.
 *
 * Le gabarit suit `VitrineEquipement` : une carte de grille à rayon 22, un
 * champ coloré en tête qui annonce ce qui identifie l'objet, puis le corps.
 * Ici la tête porte la raison sociale plutôt qu'un lieu — c'est le nom qu'on
 * cherche des yeux dans une grille d'annuaire, pas le SIRET.
 */
export function PrestataireCard({
  etablissementId,
  prestataire,
}: {
  etablissementId: string;
  prestataire: PrestataireAvecVigilance;
}) {
  const { vigilance } = prestataire;
  // L'état le plus grave réellement présent, jamais le nombre d'alertes :
  // celui-ci fondait « expirée », « expire bientôt » et « jamais fournie » en
  // un chiffre, que la tête peignait en rose. Une carte pouvait donc annoncer
  // un retard au-dessus d'une pastille « Non fournie » en ardoise, trois
  // centimètres plus bas — se contredisant elle-même. Rien n'a d'échéance tant
  // qu'il n'y a pas de document (charte, interdits 3 et 4).
  const etat = vigilance.etatLePlusGrave;

  return (
    <Link
      href={`/etablissements/${etablissementId}/prestataires/${prestataire.id}`}
      className="carte-board group flex flex-col overflow-hidden rounded-[22px]"
    >
      {/* La tête : le nom, et l'état de vigilance en un coup d'œil. La couleur
          dit l'état, jamais le volume (charte § 7) — et elle vient de
          `CHAMP_ETAT`, source unique, jamais d'un couple inventé. */}
      <span
        className="flex flex-none flex-col items-start justify-end gap-2 p-3.5 pt-4"
        style={
          etat === null
            ? {
                background: "var(--board-blue-pale)",
                color: "var(--board-blue-ink)",
              }
            : { background: CHAMP_ETAT[etat], color: ENCRE_ETAT[etat] }
        }
      >
        <span className="flex w-full items-start justify-between gap-2">
          <Handshake className="size-[22px] flex-none" aria-hidden />
          {prestataire.estOrganismeAgree && (
            <span className="rounded-full bg-[color:var(--board-card)]/70 px-2 py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]">
              Organisme agréé
            </span>
          )}
        </span>
        <span className="block min-w-0 text-[15px] font-semibold leading-[1.25] tracking-[-0.015em] line-clamp-2">
          {prestataire.raisonSociale}
        </span>
        <span className="block font-mono text-[10px] uppercase leading-[1.3] tracking-[0.1em] opacity-80">
          {prestataire.siret
            ? `SIRET ${prestataire.siret}`
            : "SIRET non renseigné"}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-3.5 px-4 pb-4 pt-3.5">
        {prestataire.domaines.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {prestataire.domaines.map((d) => (
              <span
                key={d}
                className="rounded-full bg-[color:var(--board-slate-pale)] px-2.5 py-[3px] text-[11.5px] text-[color:var(--board-slate-mid)]"
              >
                {LABEL_DOMAINE[d]}
              </span>
            ))}
          </span>
        )}

        <span className="block text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          {prestataire.contactNom}
          <span className="mt-0.5 block font-mono text-[11.5px] text-[color:var(--board-slate-soft)]">
            {prestataire.contactEmail}
          </span>
        </span>

        {/* Les deux pièces qui portent une échéance. Le Kbis n'en est pas :
            aucun texte ne lui assortit de périodicité citable, et le produit
            informe sans décréter (cf. `vigilance.ts`). */}
        <span className="mt-auto flex flex-col gap-1.5 pt-1">
          <VigilancePiecePill
            libelle="Attestation URSSAF"
            statut={vigilance.urssaf}
            jours={vigilance.urssafExpireDans}
            mention={mentionUrssaf(vigilance)}
          />
          <VigilancePiecePill
            libelle="RC Pro"
            statut={vigilance.rcPro}
            jours={vigilance.rcProExpireDans}
          />
        </span>

        <span className="flex items-center justify-between border-t border-[color:var(--board-slate-line)] pt-3">
          <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {vigilance.kbis === "present" ? "Kbis fourni" : "Kbis attendu"}
          </span>
          <span className="text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] group-hover:text-[color:var(--board-ink)]">
            Ouvrir
          </span>
        </span>
      </span>
    </Link>
  );
}
