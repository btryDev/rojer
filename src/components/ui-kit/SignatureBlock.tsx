import { cn } from "@/lib/utils";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import type { Charte } from "./charte";

/**
 * Scellé d'une signature électronique (ADR-006).
 * Affiché sous les documents signés (rapports, permis de feu, plans de
 * prévention…). Rend visibles les éléments de preuve : identité,
 * horodatage serveur, hash du document, méthode d'authentification.
 */

// Le vert du scellé, côté board, est celui de « fait » — un document
// signé est un fait accompli, pas un verdict de conformité —, et il est
// pris à la source unique (`CHAMP_ETAT` / `ENCRE_ETAT`) plutôt que
// réécrit ici. Il ne peint que la marque et son sur-titre : le bloc
// lui-même reste une surface neutre. Le papier, lui, teintait tout le
// cadre en `--accent-vif`, ce qui donnait à un scellé le poids visuel
// d'un état de conformité de l'établissement.
const CHAMP_SIGNE = CHAMP_ETAT.faite;
const ENCRE_SIGNE = ENCRE_ETAT.faite;

const BLOC: Record<Charte, string> = {
  papier:
    "relative flex flex-col gap-3 rounded-2xl border border-[color:var(--accent-vif)]/40 bg-[color:var(--accent-vif-soft)] p-5",
  // Rayon 22 et creux blanc cerné d'un filet cheveu : le scellé est le
  // frère du `BlocCreux` qui le remplace quand la signature manque, et il
  // se pose tantôt sur le canvas d'une fiche, tantôt sur une bande
  // ardoise (page d'une vérification). Le blanc tient sur les deux.
  board:
    "relative flex flex-col gap-3 rounded-[22px] bg-[color:var(--board-card)] px-6 py-5 shadow-[0_0_0_1px_var(--board-slate-line)]",
};

const MARQUE: Record<Charte, string> = {
  papier:
    "flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--accent-vif)] bg-[color:var(--paper-elevated)] font-mono text-sm text-[color:var(--accent-vif)]",
  board:
    "flex h-10 w-10 flex-none items-center justify-center rounded-full font-mono text-sm",
};

const SURTITRE: Record<Charte, string> = {
  papier: "label-admin",
  board:
    "board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]",
};

const NOM: Record<Charte, string> = {
  papier: "mt-0.5 text-[0.95rem] font-semibold text-[color:var(--ink)]",
  board:
    "mt-1 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]",
};

const META: Record<Charte, string> = {
  papier: "text-[0.82rem] text-[color:var(--muted-foreground)]",
  board: "text-[12.5px] text-[color:var(--board-slate-mid)]",
};

const HORODATAGE: Record<Charte, string> = {
  papier: "mt-0.5 font-mono text-[0.82rem] text-[color:var(--ink)]",
  board:
    "mt-1 font-mono text-[12.5px] tabular-nums text-[color:var(--board-ink)]",
};

const FUSEAU: Record<Charte, string> = {
  papier: "text-[0.7rem] text-[color:var(--muted-foreground)]",
  board: "text-[11px] text-[color:var(--board-slate-mid)]",
};

// Le pointillé n'a pas d'équivalent board, et il n'en aura pas : le board
// sépare au filet plein partout (cf. l'en-tête de `CarteFiche` et les
// `border-t` des fiches). Le pointillé était la citation typographique
// d'un formulaire imprimé — c'est justement le registre dont le board
// sort.
const FILET: Record<Charte, string> = {
  papier: "filet-pointille",
  board: "h-px bg-[color:var(--board-slate-line)]",
};

const CLE: Record<Charte, string> = {
  papier: "text-[color:var(--muted-foreground)]",
  board: "text-[color:var(--board-slate-mid)]",
};

const VALEUR: Record<Charte, string> = {
  papier: "text-[color:var(--ink)]",
  board: "text-[color:var(--board-ink)]",
};

const IDENTIFIANT: Record<Charte, string> = {
  papier:
    "font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[color:var(--seal)]",
  board:
    "font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]",
};

const LIEN_VERIFIER: Record<Charte, string> = {
  papier:
    "inline-flex items-center gap-1 rounded-full border border-[color:var(--accent-vif)] px-3 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.1em] text-[color:var(--accent-vif)] hover:bg-[color:var(--accent-vif)] hover:text-[color:var(--paper-elevated)]",
  // La pilule de contour du board (celle de `variant="boardClair"`, posée
  // en clair sur les fiches) : le lien de vérification est une porte de
  // second rang, pas la couleur du scellé.
  board:
    "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[color:var(--board-ink)] ring-1 ring-[color:rgba(10,10,10,.18)] transition-colors hover:bg-[color:var(--board-slate-pale)]",
};

const CORPS: Record<Charte, string> = {
  papier: "grid grid-cols-1 gap-y-2 text-[0.78rem] sm:grid-cols-2 sm:gap-x-6",
  board: "grid grid-cols-1 gap-y-2 text-[12.5px] sm:grid-cols-2 sm:gap-x-6",
};

export function SignatureBlock({
  signataireNom,
  signataireRole,
  signataireEmail,
  horodatageIso,
  methode,
  hashDocument,
  nomDocument,
  signatureId,
  verifierHref,
  charte = "papier",
}: {
  signataireNom: string;
  signataireRole?: string | null;
  signataireEmail?: string | null;
  horodatageIso: Date | string;
  methode: "compte_connecte" | "otp_email";
  hashDocument: string;
  nomDocument?: string | null;
  signatureId: string;
  verifierHref?: string;
  /** La grammaire visuelle de l'écran qui porte le scellé. */
  charte?: Charte;
}) {
  const date =
    typeof horodatageIso === "string" ? new Date(horodatageIso) : horodatageIso;
  const dateHumaine = date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  // ~~« Compte connecté + OTP »~~ (2026-11-19, cahier de reprise § 8.2) : la
  // signature depuis le compte ne demande aucun code, la mention le laissait
  // croire. Et la méthode se dit en français, pas en sigle.
  const methodeLabel =
    methode === "compte_connecte" ? "Compte connecté" : "Lien et code par e-mail";
  const hashCourt =
    hashDocument.length > 16
      ? `${hashDocument.slice(0, 10)}…${hashDocument.slice(-6)}`
      : hashDocument;
  const board = charte === "board";

  return (
    <div
      className={cn(BLOC[charte])}
      role="group"
      aria-label={`Signature électronique de ${signataireNom}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={MARQUE[charte]}
            style={
              board ? { background: CHAMP_SIGNE, color: ENCRE_SIGNE } : undefined
            }
          >
            ✓
          </span>
          <div>
            <div
              className={SURTITRE[charte]}
              style={board ? { color: ENCRE_SIGNE } : undefined}
            >
              Signé électroniquement
            </div>
            <div className={NOM[charte]}>{signataireNom}</div>
            {signataireRole && (
              <div className={META[charte]}>{signataireRole}</div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className={SURTITRE[charte]}>Horodatage serveur</div>
          <div className={HORODATAGE[charte]}>{dateHumaine}</div>
          <div className={FUSEAU[charte]}>Fuseau Europe/Paris</div>
        </div>
      </div>

      <div className={FILET[charte]} />

      <dl className={CORPS[charte]}>
        {signataireEmail && (
          <div className="flex gap-2">
            <dt className={CLE[charte]}>Email :</dt>
            <dd className={cn("font-mono", VALEUR[charte])}>
              {signataireEmail}
            </dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className={CLE[charte]}>Méthode :</dt>
          <dd className={VALEUR[charte]}>{methodeLabel}</dd>
        </div>
        {nomDocument && (
          <div className="col-span-full flex gap-2">
            <dt className={CLE[charte]}>Document :</dt>
            <dd className={cn("truncate font-mono", VALEUR[charte])}>
              {nomDocument}
            </dd>
          </div>
        )}
        <div className="col-span-full flex gap-2">
          <dt className={CLE[charte]}>Empreinte SHA-256 :</dt>
          <dd className={cn("font-mono", VALEUR[charte])} title={hashDocument}>
            {hashCourt}
          </dd>
        </div>
        <div className="col-span-full flex items-center justify-between gap-4">
          <span className={IDENTIFIANT[charte]}>
            ID&nbsp;· {signatureId}
          </span>
          {verifierHref && (
            <a href={verifierHref} className={LIEN_VERIFIER[charte]}>
              Vérifier l&apos;intégrité →
            </a>
          )}
        </div>
      </dl>
    </div>
  );
}
