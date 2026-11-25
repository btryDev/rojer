"use client";

import { useId } from "react";
import type { ModeRendezVous } from "@prisma/client";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import type { RendezVousState } from "@/lib/assistance/rendez-vous-actions";
import {
  SUJET_RENDEZ_VOUS_MAX,
  TELEPHONE_MAX,
  enumeration,
  jourAvecAnnee,
  jusquAQuand,
  majuscule,
  plageHoraire,
  type CreneauAffiche,
} from "@/lib/assistance/rendez-vous-libelles";
import { CREUX, PETIT, SURTITRE } from "./styles-rendez-vous";
import { useFocusAuMontage } from "./useFocusAuMontage";

/** Ce que l'étape 2 a saisi : gardé par l'onglet quand on revient choisir un autre créneau. */
export type Brouillon = { mode: ModeRendezVous; telephone: string; sujet: string };

const MODES: { mode: ModeRendezVous; titre: string; texte: string; Icone: typeof Video }[] = [
  { mode: "visio", titre: "En visio", texte: "Le lien arrive par e-mail avant le rendez-vous.", Icone: Video },
  { mode: "telephone", titre: "Par téléphone", texte: "Nous vous appelons au numéro indiqué.", Icone: Phone },
];

const LABEL = "mb-2 block text-[12.5px] font-semibold text-[color:var(--board-slate-ink)]";
const ERREUR = "m-0 mt-1 text-[12px] text-[color:var(--board-signal-ink)]";

/**
 * Étape 2 du rendez-vous annuel (maquette « Vos coordonnées ») : la visio ou
 * le téléphone, ce qui est à aborder ; à droite, le récapitulatif et le
 * bouton qui réserve. La saisie est tenue par l'onglet (`brouillon`).
 */
export function CoordonneesRendezVous({
  choisi,
  email,
  moi,
  etablissements,
  remplace,
  brouillon,
  changer,
  etablissementId,
  reserver,
  reservation,
  etat,
  focaliser,
  retour,
}: {
  choisi: CreneauAffiche;
  email: string | null;
  /** La personne connectée : « Réservé par ». */
  moi: string | null;
  etablissements: string[];
  /** Le rendez-vous à venir que ce créneau remplace, figé à l'ouverture du parcours. */
  remplace?: string;
  brouillon: Brouillon;
  changer: (b: Brouillon) => void;
  etablissementId: string;
  reserver: (f: FormData) => void;
  reservation: boolean;
  /** L'état de l'action, sans celui déjà lu sur une autre étape. */
  etat: RendezVousState;
  /** Ouverte par un geste : son titre prend le focus. */
  focaliser: boolean;
  retour: () => void;
}) {
  const ids = {
    titre: useId(),
    recap: useId(),
    telephone: useId(),
    erreurTelephone: useId(),
    sujet: useId(),
    erreurSujet: useId(),
  };
  const titreRef = useFocusAuMontage<HTMLHeadingElement>(focaliser);
  const { mode, telephone, sujet } = brouillon;
  const err = (champ: string) => (etat.status === "error" ? etat.fieldErrors?.[champ]?.[0] : undefined);
  const debut = new Date(choisi.debut);
  const fin = new Date(choisi.fin);
  // L'erreur d'un champ lui est reliée : dite quand on y revient (charte, ChampBoard).
  const champTelephone = {
    id: ids.telephone,
    name: "telephone",
    type: "tel",
    autoComplete: "tel",
    maxLength: TELEPHONE_MAX,
    value: telephone,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => changer({ ...brouillon, telephone: e.target.value }),
    "aria-invalid": err("telephone") ? true : undefined,
    "aria-describedby": err("telephone") ? ids.erreurTelephone : undefined,
    className: "champ-board",
  };

  return (
    <section aria-labelledby={ids.titre} className="carte-board flex flex-col gap-[26px] px-6 pt-7 pb-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5">
        <div className="flex flex-col gap-1.5">
          <p className={SURTITRE}>Étape 2 sur 2</p>
          <h2 id={ids.titre} ref={titreRef} tabIndex={-1} className="board-titre m-0 text-[22px] focus:outline-none">
            Comment souhaitez-vous échanger&#160;?
          </h2>
        </div>
        <Button type="button" variant="boardClair" size="boardSm" onClick={retour} disabled={reservation}>
          <ArrowLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
          Changer de créneau
        </Button>
      </div>

      {/* Tous les champs sont tenus par l'état : la remise à zéro que React
          fait à la fin de l'action ramènerait le choix visio / téléphone du
          montage, sans que l'écran le montre (relecture du 2026-11-24). */}
      <form
        action={reserver}
        onReset={(e) => e.preventDefault()}
        className="flex flex-wrap items-start gap-7"
        // Un geste du compte : le gel d'un site ne le ferme pas (`VerrouDeLaPage`).
        data-geste-du-compte
      >
        <input type="hidden" name="creneauId" value={choisi.id} />
        <input type="hidden" name="etablissementId" value={etablissementId} />
        {remplace ? <input type="hidden" name="remplace" value={remplace} /> : null}

        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-6">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">Comment souhaitez-vous échanger ?</legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
              {MODES.map(({ mode: m, titre, texte, Icone }) => {
                const on = mode === m;
                return (
                  <label
                    key={m}
                    className={`relative flex cursor-pointer items-start gap-3.5 rounded-[20px] bg-white px-[18px] py-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)] ${
                      on
                        ? "shadow-[inset_0_0_0_2px_var(--board-ink)]"
                        : "shadow-[inset_0_0_0_1px_var(--board-slate-line)] hover:shadow-[inset_0_0_0_1px_var(--board-slate)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={on}
                      onChange={() => changer({ ...brouillon, mode: m })}
                      className="pointer-events-none absolute opacity-0"
                    />
                    <span
                      className={`grid size-10 flex-none place-items-center rounded-[14px] ${
                        on ? "bg-[color:var(--board-ink)] text-white" : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-ink)]"
                      }`}
                    >
                      <Icone className="size-[19px]" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="flex flex-col gap-[3px] text-[13px] leading-[1.45] text-[color:var(--board-slate-mid)]">
                      <strong className="text-[14.5px] font-semibold text-[color:var(--board-ink)]">{titre}</strong>
                      <span>{texte}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {mode === "visio" ? (
            <div className="flex flex-wrap gap-[18px]">
              <div className="min-w-0 flex-[1_1_260px]">
                <span className={LABEL}>Le lien arrive par e-mail à</span>
                <p className="m-0 truncate rounded-2xl px-3.5 py-[11px] text-[13.5px] text-[color:var(--board-ink)] shadow-[inset_0_0_0_1px_var(--board-slate-line)]">
                  {email ?? "l'adresse de votre compte"}
                </p>
              </div>
              <div className="min-w-0 flex-[1_1_220px]">
                <label className={LABEL} htmlFor={ids.telephone}>
                  Un numéro, en cas de souci de connexion
                </label>
                <input {...champTelephone} />
                {err("telephone") && (
                  <p id={ids.erreurTelephone} className={ERREUR}>
                    {err("telephone")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-[320px]">
              <label className={LABEL} htmlFor={ids.telephone}>
                Le numéro où vous appeler
              </label>
              <input {...champTelephone} required />
              {err("telephone") && (
                <p id={ids.erreurTelephone} className={ERREUR}>
                  {err("telephone")}
                </p>
              )}
            </div>
          )}

          <div>
            <label className={LABEL} htmlFor={ids.sujet}>
              Ce que vous voulez aborder <span className="font-normal text-[color:var(--board-slate-soft)]">(facultatif)</span>
            </label>
            <textarea
              id={ids.sujet}
              name="sujet"
              rows={4}
              maxLength={SUJET_RENDEZ_VOUS_MAX}
              value={sujet}
              onChange={(e) => changer({ ...brouillon, sujet: e.target.value })}
              aria-invalid={err("sujet") ? true : undefined}
              aria-describedby={err("sujet") ? ids.erreurSujet : undefined}
              className="champ-board resize-y"
              placeholder="Par exemple : préparer une visite de la commission, relire un plan d'actions."
            />
            {err("sujet") && (
              <p id={ids.erreurSujet} className={ERREUR}>
                {err("sujet")}
              </p>
            )}
            <p className={`${PETIT} mt-2`}>Ce que vous notez ici nous parvient avant le rendez-vous, pour le préparer.</p>
          </div>
        </div>

        <aside aria-labelledby={ids.recap} className={`${CREUX} flex min-w-0 flex-[1_1_300px] flex-col gap-[18px] p-6`}>
          <div className="flex flex-col gap-1.5">
            <p id={ids.recap} className={SURTITRE}>
              Votre rendez-vous
            </p>
            <p className="board-titre m-0 text-[24px]">{majuscule(jourAvecAnnee(debut))}</p>
            <p className="m-0 text-[14px] tabular-nums text-[color:var(--board-slate-ink)]">{plageHoraire(debut, fin)}, heure de Paris</p>
          </div>
          <dl className="m-0 flex flex-col gap-3">
            <div>
              <dt className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">Comment</dt>
              <dd className="m-0 mt-0.5 text-[14px] leading-[1.45] text-[color:var(--board-ink)]">
                {mode === "visio"
                  ? "En visio — le lien arrive par e-mail"
                  : `Par téléphone${telephone.trim() ? `, au ${telephone.trim()}` : ""}`}
              </dd>
            </div>
            <div>
              <dt className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">Pour</dt>
              <dd className="m-0 mt-0.5 text-[14px] leading-[1.45] text-[color:var(--board-ink)]">
                Tout le compte&#160;: {enumeration(etablissements)}
              </dd>
            </div>
            {moi ? (
              <div>
                <dt className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">Réservé par</dt>
                <dd className="m-0 mt-0.5 text-[14px] leading-[1.45] text-[color:var(--board-ink)]">{moi}</dd>
              </div>
            ) : null}
          </dl>
          <p className={`${PETIT} border-t border-[color:var(--board-slate-line)] pt-3.5`}>
            Déplaçable ou annulable jusqu&apos;au {jusquAQuand(debut)}. Ensuite, ou en cas d&apos;absence, il compte pour
            l&apos;année.
          </p>
          <MessageFormulaire ton="alerte">
            {/* Une erreur de champ se dit aussi près du bouton, et s'annonce : sur
                téléphone, le champ est loin (relecture du 2026-11-25). */}
            {etat.status !== "error"
              ? null
              : err("telephone") || err("sujet")
                ? `Vérifiez le champ signalé plus haut : ${err("telephone") ?? err("sujet")}`
                : etat.message}
          </MessageFormulaire>
          <Button type="submit" variant="board" enCours={reservation} className="h-11 w-full">
            {reservation ? "Réservation…" : remplace ? "Déplacer le rendez-vous" : "Réserver ce rendez-vous"}
          </Button>
          <p className={`${PETIT} text-center`}>Une confirmation part aussitôt par e-mail, avec l&apos;invitation pour votre agenda.</p>
        </aside>
      </form>
    </section>
  );
}
