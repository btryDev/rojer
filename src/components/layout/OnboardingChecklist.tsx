import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";

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

export function OnboardingChecklist({
  etapes,
  etablissementRaison,
}: {
  etapes: EtapeOnboarding[];
  etablissementRaison: string;
}) {
  const faites = etapes.filter((e) => e.faite).length;
  const total = etapes.length;
  if (faites === total) return null;

  // Première étape pas faite → c'est celle qu'on met en avant
  const indexProchaine = etapes.findIndex((e) => !e.faite);

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="carte-board relative overflow-hidden"
    >
      {/* Bandeau haut */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 pt-6 pb-5 sm:px-8">
        <div className="min-w-0">
          <p
            id="onboarding-heading"
            className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]"
          >
            Guide de mise en place
          </p>
          <h2 className="board-titre m-0 mt-2 text-[22px]">
            Quelques étapes pour couvrir l&apos;essentiel de {etablissementRaison}
          </h2>
          <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Pas d&apos;urgence : chaque étape se traite à votre rythme.
            L&apos;outil met simplement en lumière les éléments qu&apos;un
            contrôle (inspection du travail, commission de sécurité,
            assureur, bailleur) pourrait vous demander.
          </p>
        </div>

        {/* Progression numérique + segments */}
        <div className="flex min-w-[160px] flex-col items-start gap-2 sm:items-end">
          <p className="board-eyebrow m-0 text-[10px] tabular-nums tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {/* Numéro de l'étape courante (le composant retourne null quand
                tout est fait, donc indexProchaine >= 0 ici). */}
            Étape {indexProchaine + 1}{" "}
            <span className="text-[color:var(--board-ink)]">sur {total}</span>
          </p>
          <div className="flex gap-1" aria-hidden>
            {etapes.map((e, i) => (
              <span
                key={e.id}
                className="h-[5px] w-8 rounded-full"
                style={{
                  background: e.faite
                    ? CHAMP_ETAT.faite
                    : i === indexProchaine
                      ? "var(--board-ink)"
                      : "var(--board-slate)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Liste des étapes */}
      <ol className="divide-y divide-[color:var(--board-slate-line)]">
        {etapes.map((e, i) => {
          const prochaine = i === indexProchaine;
          return (
            <li
              key={e.id}
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
                <p className="m-0 mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
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
        })}
      </ol>

      {/* Bandeau bas rassurance */}
      <div className="border-t border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-7 py-3.5 sm:px-8">
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
          Ce guide disparaîtra automatiquement une fois les étapes complétées.
        </p>
      </div>
    </section>
  );
}
