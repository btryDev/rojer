"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { calculerCriticite } from "@/lib/cotation";
import { questionsCotation } from "@/lib/cotation/questions";
import {
  enregistrerCotation,
  type CotationActionState,
} from "@/lib/risques/actions";
import { RENOUVELLEMENT_MESURAGE_BRUIT } from "@/lib/referentiels/conformite/textes-duerp";

type Props = {
  risqueId: string;
  initial: {
    gravite: number;
    probabilite: number;
    maitrise: number;
    nombreSalariesExposes: number | null;
    dateMesuresPhysiques: string | null;
    exposeCMR: boolean;
  };
  cotationSaisie: boolean;
  hrefRetourUnite: string;
  hrefMesures: string;
  hrefSuivant?: string;
};

const titreAxe: Record<string, string> = {
  gravite: "Gravité",
  probabilite: "Probabilité",
  maitrise: "Maîtrise actuelle",
};

export function CotationForm({
  risqueId,
  initial,
  cotationSaisie,
  hrefRetourUnite,
  hrefMesures,
  hrefSuivant,
}: Props) {
  const router = useRouter();
  const action = enregistrerCotation.bind(null, risqueId);
  const [state, formAction, pending] = useActionState<
    CotationActionState,
    FormData
  >(action, { status: "idle" });

  // Premier remplissage : aucune réponse pré-cochée, même si la base
  // contient des défauts de secteur (stockés à la création pour la
  // référence sectorielle). L'utilisateur doit choisir activement.
  const [gravite, setGravite] = useState(
    cotationSaisie ? initial.gravite : 0,
  );
  const [probabilite, setProbabilite] = useState(
    cotationSaisie ? initial.probabilite : 0,
  );
  const [maitrise, setMaitrise] = useState(
    cotationSaisie ? initial.maitrise : 0,
  );

  const toutesReponses = gravite > 0 && probabilite > 0 && maitrise > 0;

  const criticiteLive = useMemo(
    () =>
      toutesReponses
        ? calculerCriticite({ gravite, probabilite, maitrise })
        : null,
    [gravite, probabilite, maitrise, toutesReponses],
  );

  // Après la toute première validation sans alerte, on enchaîne naturellement
  // vers la partie 02 · Mesures. Si une alerte de sous-cotation remonte,
  // on reste sur place pour la présenter à l'utilisateur.
  useEffect(() => {
    if (
      state.status === "success" &&
      !cotationSaisie &&
      !state.alerte
    ) {
      router.push(hrefMesures);
    }
  }, [state, cotationSaisie, hrefMesures, router]);

  const setter = (axe: string) => {
    if (axe === "gravite") return setGravite;
    if (axe === "probabilite") return setProbabilite;
    return setMaitrise;
  };
  const valeurActuelle = (axe: string) =>
    axe === "gravite" ? gravite : axe === "probabilite" ? probabilite : maitrise;

  const nombreAxes = questionsCotation.length;

  return (
    <form action={formAction} className="space-y-10">
      {questionsCotation.map((q, i) => {
        const estMaitrise = q.axe === "maitrise";
        return (
          <fieldset key={q.axe} className="space-y-4">
            <div className="flex items-baseline gap-3 border-b border-[color:var(--board-slate-line)] pb-3">
              <span className="board-eyebrow text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
                {String(i + 1).padStart(2, "0")}
                <span className="mx-1 text-[color:var(--board-slate)]">/</span>
                {String(nombreAxes).padStart(2, "0")}
              </span>
              <legend className="text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                <span className="board-eyebrow block text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                  {titreAxe[q.axe] ?? q.axe}
                </span>
                <span className="mt-1 block">{q.intitule}</span>
              </legend>
            </div>

            {estMaitrise && (
              // Note de lecture, pas état : sous-bloc creux, et le bleu du
              // board seulement sur le sur-titre.
              <aside className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
                <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-blue-ink)]">
                  À lire avant de cocher
                </p>
                <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                  La maîtrise décrit l&apos;état{" "}
                  <span className="font-semibold">actuel</span> de votre
                  prévention pour ce risque.{" "}
                  <span className="font-medium">
                    La partie 02 — Mesures — vient juste après
                  </span>
                  {" "}: vous y listerez précisément ce qui est en place et ce
                  qui est prévu. Vous pourrez alors revenir ajuster la maîtrise
                  si l&apos;inventaire vous surprend.
                </p>
              </aside>
            )}

            <div className="space-y-2">
              {q.options.map((opt) => {
                const id = `${q.axe}-${opt.valeur}`;
                const checked = valeurActuelle(q.axe) === opt.valeur;
                return (
                  <label
                    key={id}
                    htmlFor={id}
                    className={`flex cursor-pointer items-start gap-3 rounded-[16px] border p-3.5 transition-colors ${
                      checked
                        ? "border-[color:var(--board-ink)] bg-[color:var(--board-slate-pale)]"
                        : "border-[color:var(--board-slate-line)] hover:bg-[color:var(--board-slate-pale)]"
                    }`}
                  >
                    <input
                      type="radio"
                      id={id}
                      name={q.axe}
                      value={opt.valeur}
                      defaultChecked={checked}
                      onChange={() => setter(q.axe)(opt.valeur)}
                      className="mt-1 accent-[color:var(--board-ink)]"
                      required
                    />
                    <span className="flex min-w-0 flex-1 items-baseline gap-3">
                      <span className="font-mono text-[12px] font-semibold tabular-nums text-[color:var(--board-slate-soft)]">
                        {opt.valeur}
                      </span>
                      <span className="text-[13.5px] leading-[1.55] text-[color:var(--board-ink)]">
                        {opt.libelle}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* Résultat calculé — n'apparaît qu'après les 3 réponses.
          La criticité ne prend aucune couleur de niveau : la charte board
          n'a pas de barème de cotation, et ses couples champ/encre disent
          tous un état d'échéance. Peindre un 14/16 en rose le ferait lire
          « en retard ». Le nombre et le rappel de la formule suffisent. */}
      <div className="grid gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
        <div className="flex items-baseline gap-3">
          <span
            className={`font-mono text-[64px] font-semibold leading-none tabular-nums ${
              criticiteLive !== null
                ? "text-[color:var(--board-ink)]"
                : "text-[color:var(--board-slate)]"
            }`}
          >
            {criticiteLive !== null
              ? String(criticiteLive).padStart(2, "0")
              : "—"}
          </span>
          <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            <span className="block">sur 16</span>
            <span className="block">criticité</span>
          </span>
        </div>
        <div>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {criticiteLive !== null ? "Formule retenue" : "En attente"}
          </p>
          {criticiteLive !== null ? (
            <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
              (gravité × probabilité) ÷ maîtrise — arrondi à l&apos;entier et
              borné entre 1 et 16. Plus la note est haute, plus le risque est
              prioritaire.
            </p>
          ) : (
            <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Répondez aux{" "}
              <span className="tabular-nums">
                {[gravite, probabilite, maitrise].filter((v) => v > 0).length}
                /3
              </span>{" "}
              questions ci-dessus pour voir apparaître la criticité. Rien n&apos;est
              enregistré tant que vous n&apos;avez pas validé.
            </p>
          )}
        </div>
      </div>

      <fieldset className="space-y-5 rounded-[22px] border border-[color:var(--board-slate-line)] px-6 py-6">
        <legend className="board-eyebrow px-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          Informations complémentaires · facultatives
        </legend>
        <p className="m-0 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Utiles à la traçabilité de l&apos;évaluation.
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* `type="number"` est conservé à dessein, contre la règle de saisie
              de la charte : le schéma serveur (`infosComplementairesSchema`)
              rejette tout le bloc complémentaire d'un coup si la valeur ne
              coerce pas, et une saisie libre y ferait disparaître en silence
              la date de mesures et la case CMR. La règle attend que ce
              schéma tolère l'entrée non numérique. */}
          <ChampBoard
            id="nombreSalariesExposes"
            name="nombreSalariesExposes"
            label="Nombre de salariés exposés"
            type="number"
            min={0}
            step={1}
            defaultValue={initial.nombreSalariesExposes ?? ""}
            placeholder="ex. 3"
            aide="Critère d'appréciation recommandé par l'INRS (ED 840)."
          />

          <ChampBoard
            id="dateMesuresPhysiques"
            name="dateMesuresPhysiques"
            label="Dernières mesures physiques"
            type="date"
            defaultValue={initial.dateMesuresPhysiques ?? ""}
            aide={`Date des dernières mesures physiques de ce risque, si des mesures ont été réalisées (bruit, éclairement, ambiances thermiques, vibrations). Pour le bruit : «\u00a0${RENOUVELLEMENT_MESURAGE_BRUIT}\u00a0» (art. R. 4433-2).`}
          />
        </div>

        <label className="flex items-start gap-3 rounded-[16px] border border-[color:var(--board-slate-line)] p-4">
          <input
            type="checkbox"
            id="exposeCMR"
            name="exposeCMR"
            defaultChecked={initial.exposeCMR}
            className="mt-0.5 accent-[color:var(--board-ink)]"
          />
          <span className="space-y-1.5">
            <span className="block text-[14px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">
              Exposition à un agent CMR
            </span>
            <span className="block max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Cancérogène, Mutagène ou toxique pour la Reproduction
              (art. R. 4412-59 et suivants). À cocher si un ou plusieurs
              salariés sont exposés — cela déclenche des obligations renforcées
              (liste nominative, suivi médical, substitution prioritaire).
            </span>
          </span>
        </label>
      </fieldset>

      {state.status === "success" && state.alerte && (
        // Écart avec un repère indicatif : encre de signal sur voile, jamais
        // le champ rose — rien ici n'a d'échéance dépassée (interdit 3).
        <div className="rounded-[22px] bg-[color:var(--board-signal-wash)] px-6 py-5">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-signal-ink)]">
            Écart avec le repère indicatif
          </p>
          <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
            {state.alerte}
          </p>
          <p className="m-0 mt-3 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Vous pouvez rester ici et ajuster vos réponses, ou enchaîner vers
            les mesures si vous assumez la cotation.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={hrefMesures}
              className={buttonVariants({
                variant: "boardClair",
                size: "boardSm",
              })}
            >
              Passer aux mesures malgré tout →
            </Link>
          </div>
        </div>
      )}

      {state.status === "success" && !state.alerte && cotationSaisie && (
        <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] tabular-nums text-[color:var(--board-green-ink)]">
            Cotation mise à jour · criticité{" "}
            {String(state.criticite).padStart(2, "0")} / 16
          </p>
          <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Les mesures (partie 02) reflètent votre prévention concrète.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      {/* Actions — primaire à droite, navigation de repli à gauche */}
      <div className="space-y-5 border-t border-[color:var(--board-slate-line)] pt-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            href={hrefRetourUnite}
            className={buttonVariants({
              variant: "boardClair",
              size: "boardSm",
            })}
          >
            ← Retour à l&apos;unité
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {cotationSaisie ? (
              <>
                <Button
                  type="submit"
                  variant="boardClair"
                  size="board"
                  disabled={pending || !toutesReponses}
                >
                  {pending ? "Enregistrement…" : "Mettre à jour la cotation"}
                </Button>
                <Link
                  href={hrefMesures}
                  className={buttonVariants({
                    variant: "board",
                    size: "board",
                  })}
                >
                  <span className="mr-2 font-mono tabular-nums opacity-70">
                    02
                  </span>
                  Passer aux mesures →
                </Link>
              </>
            ) : (
              <Button
                type="submit"
                variant="board"
                size="board"
                disabled={pending || !toutesReponses}
              >
                {pending
                  ? "Enregistrement…"
                  : toutesReponses
                    ? "Enregistrer & passer aux mesures →"
                    : "Répondez aux 3 questions pour continuer"}
              </Button>
            )}
          </div>
        </div>

        {hrefSuivant && cotationSaisie && (
          <p className="m-0 max-w-[66ch] text-center text-[12px] leading-[1.55] text-[color:var(--board-slate-soft)] sm:mx-auto">
            Ou passez directement au{" "}
            <Link
              href={hrefSuivant}
              className="font-medium text-[color:var(--board-blue-ink)] hover:underline"
            >
              risque suivant à coter
            </Link>{" "}
            sans renseigner les mesures maintenant.
          </p>
        )}
      </div>
    </form>
  );
}
