import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import { GuideDepliant } from "./GuideDepliant";

/**
 * Guide de mise en place progressif, affiché sur la page "Vue d'ensemble"
 * d'un établissement tant que les étapes de base ne sont pas complètes.
 *
 * Objectif pédagogique : accompagner un dirigeant de TPE non-expert en
 * santé-sécurité en montrant clairement "où j'en suis" et "quoi faire
 * ensuite", sans jargon, avec un pourquoi à chaque étape.
 *
 * Aucune étape n'est bloquante. La checklist s'efface d'elle-même dès
 * que tout est fait — on ne harcèle pas l'utilisateur qui a fini.
 *
 * Charte board (`docs/charte-board.md`) : le bloc était une carte papier à
 * filets pointillés, avec un vert `emerald` qui n'appartient à aucune des
 * deux palettes. Le vert du board dit « fait », et il vient de
 * `CHAMP_ETAT` / `ENCRE_ETAT` — une table de couleurs locale de plus, et
 * l'étape faite ici cesse d'être du même vert que l'échéance faite là-bas.
 */

export type EtapeOnboarding = {
  id: string;
  titre: string;
  pourquoi: string;
  faite: boolean;
  href?: string;
  /** Texte du bouton d'action. Non affiché si l'étape est faite. */
  cta?: string;
  /**
   * Une étape qui se règle **ici**, sans quitter l'écran : la question est
   * posée dans la liste et sa réponse s'y donne (ADR-025 § 7).
   *
   * Deux questions de paramétrage n'avaient nulle part où vivre — « Paramètres »
   * pointe la page de connexion d'un assistant, et il n'existe pas d'écran de
   * réglage du dossier. La checklist est l'endroit du produit qui sait déjà
   * poser une question et disparaître quand elle est répondue ; leur foyer
   * définitif viendra avec la refonte de la navigation.
   *
   * Exclusif de `href`/`cta` : une étape qui se règle sur place n'envoie
   * nulle part. La suite éventuelle d'une réponse « oui » est portée par le
   * formulaire lui-même.
   */
  question?: React.ReactNode;
};

export function OnboardingChecklist({ etapes }: { etapes: EtapeOnboarding[] }) {
  const faites = etapes.filter((e) => e.faite).length;
  const total = etapes.length;
  if (faites === total) return null;

  // Première étape pas faite → c'est celle qu'on met en avant
  const indexProchaine = etapes.findIndex((e) => !e.faite);
  const prochaine = etapes[indexProchaine];

  // [2026-10-25] Un bandeau, la prochaine étape d'abord (planche C de
  // l'artefact, retenue par la propriétaire) : l'introduction et ses six
  // étapes dépliées repoussaient le board d'un écran entier, pour n'en
  // traiter qu'une à la fois. Les autres se déplient sous le bandeau.
  return (
    <section
      aria-labelledby="onboarding-heading"
      className="overflow-hidden rounded-[30px] ring-1 ring-[color:rgba(13,18,36,.10)]"
    >
      <GuideDepliant
        bandeau={
          <div className="flex min-w-0 items-center gap-5">
            {/* Décorative — la personne au travail ; origine et licence :
                `public/photos/README.md`. */}
            <Image
              src="/photos/guide-ordinateur.jpg"
              alt=""
              width={96}
              height={96}
              sizes="96px"
              className="size-20 flex-none rounded-[20px] object-cover object-[62%_center] sm:size-24"
            />
            <div className="min-w-0">
              <p
                id="onboarding-heading"
                className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-white/65"
              >
                Guide de mise en place · étape {indexProchaine + 1} sur {total}
              </p>
              <h2 className="m-0 mt-2 text-[20px] font-semibold leading-[1.25] tracking-[-0.02em] text-white">
                Prochaine étape : {prochaine.titre}
              </h2>
              <div className="mt-3 flex w-[min(280px,100%)] gap-1" aria-hidden>
                {etapes.map((e, i) => (
                  <span
                    key={e.id}
                    className="h-[5px] flex-1 rounded-full"
                    style={{
                      background: e.faite
                        ? CHAMP_ETAT.faite
                        : i === indexProchaine
                          ? "#ffffff"
                          : "rgba(255,255,255,.18)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        }
        action={
          prochaine.href && prochaine.cta ? (
            <Link
              href={prochaine.href}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[color:var(--board-ink)] transition-colors hover:bg-white/90"
            >
              {prochaine.cta} →
            </Link>
          ) : null
        }
      >
        <ol className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-0">
          {etapes.map((e, i) => (
            <LigneEtape key={e.id} etape={e} rang={i} prochaine={i === indexProchaine} />
          ))}
        </ol>
      </GuideDepliant>
    </section>
  );
}

/** Une étape : sa puce de statut, son titre, son pourquoi, et son geste. */
function LigneEtape({
  etape: e,
  rang: i,
  prochaine,
}: {
  etape: EtapeOnboarding;
  rang: number;
  prochaine: boolean;
}) {
  return (
    <li
      className={
        "flex items-start gap-4 px-7 py-5 sm:px-8 " +
        (prochaine ? "bg-[color:var(--board-slate-pale)]" : "")
      }
    >
      {/* Puce de statut. Le vert vient des jetons d'état : c'est le
          même « fait » qu'ailleurs, champ et encre ensemble. */}
      <div
        aria-hidden
        className={
          "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border " +
          (e.faite || prochaine
            ? "border-transparent"
            : "border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] text-[color:var(--board-slate-mid)]")
        }
        style={
          e.faite
            ? { background: CHAMP_ETAT.faite, color: ENCRE_ETAT.faite }
            : prochaine
              ? {
                  background: "var(--board-ink)",
                  color: "var(--board-card)",
                }
              : undefined
        }
      >
        {e.faite ? (
          <svg
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 8.5 6.5 12 13 5" />
          </svg>
        ) : (
          <span className="font-mono text-[0.62rem] font-bold tabular-nums">
            {i + 1}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="min-w-0 flex-1">
        <p
          className={
            "m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] " +
            (e.faite
              ? "text-[color:var(--board-slate-mid)] line-through"
              : "text-[color:var(--board-ink)]")
          }
        >
          {e.titre}
        </p>
        <p className="m-0 mt-1 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {e.pourquoi}
        </p>

        {!e.faite && e.question}

        {!e.faite && e.href && e.cta && (
          <div className="mt-3">
            <Link
              href={e.href}
              className={buttonVariants({
                variant: prochaine ? "board" : "boardClair",
                size: "boardSm",
              })}
            >
              {e.cta} →
            </Link>
          </div>
        )}
      </div>
    </li>
  );
}
