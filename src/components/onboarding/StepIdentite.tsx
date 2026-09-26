"use client";

import { Check, OctagonX } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ChampBoard, SectionChamps } from "@/components/ui-kit";
import { BlocCreux } from "@/components/ui-kit/fiche";
import { evaluerScopeSecteur } from "@/lib/onboarding/scope";
import { refusEffectif } from "./validation";
import type { StepProps } from "./types";

const SUGGESTIONS_NAF = [
  { code: "56.10A", libelle: "Restauration" },
  { code: "47.11B", libelle: "Alimentation" },
  { code: "70.22Z", libelle: "Conseil" },
  { code: "71.12B", libelle: "Ingénierie" },
];

/**
 * Étape 1 sur 3 — Identité juridique + lieu principal, réunies dans un seul
 * écran, une carte board par section.
 *
 * Les sections portaient une numérotation romaine (« § I », « § II ») : on
 * l'a retirée. Contrairement aux étapes du wizard, ces deux blocs se
 * remplissent dans l'ordre qu'on veut — la numérotation n'y portait aucune
 * information (cf. `SectionChamps`).
 */
export function StepIdentite({ state, update, errors, blocage }: StepProps) {
  const scope =
    state.codeNaf.trim().length > 0
      ? evaluerScopeSecteur(state.codeNaf)
      : null;
  // Le refus de périmètre se lit en direct, sans attendre le clic (voir
  // `refusEffectif`). Les autres refus, eux, n'arrivent qu'au passage
  // d'étape — mais ils se rendent au champ qu'ils visent plutôt que d'être
  // rendus en bas de colonne.
  const refus = refusEffectif(state.effectifSurSite);
  const repere = refus ? null : repereEffectif(state.effectifSurSite);
  /** L'erreur d'un champ : le refus de passage d'étape, sinon le serveur. */
  const messagePour = (champ: string) =>
    (blocage?.champ === champ ? blocage.message : undefined) ??
    errors?.[champ];
  const erreurNaf = messagePour("codeNaf");

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <h2 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
          Décrivez votre établissement
        </h2>
        <p className="m-0 mt-2.5 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Ces informations servent à identifier vos obligations
          réglementaires.
        </p>
      </div>

      {/* Chaque section prend la carte blanche du board : posé à même le
          canvas, le creux ardoise du `.champ-board` ne s'en détache plus
          (1,03:1) et les champs s'effacent. */}
      <section className="carte-board px-7 py-6 sm:px-8">
        <SectionChamps titre="Identité juridique">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <ChampBoard
              className="sm:col-span-2"
              id="raisonSociale"
              name="raisonSociale"
              label="Raison sociale"
              requis
              value={state.raisonSociale}
              onChange={(e) => update({ raisonSociale: e.target.value })}
              placeholder="Ex : Bistrot du marché SARL"
              autoFocus
              erreur={messagePour("raisonSociale")}
            />

            <div>
              {/* L'infobulle est SORTIE du <label> : elle rend un <button>,
                  et un contrôle interactif dans un label vole le clic au
                  champ tout en entrant dans son nom accessible. */}
              <span className="flex items-center gap-1">
                <label className="label-board" htmlFor="siret">
                  SIRET
                </label>
                <InfoTooltip>
                  Le SIRET figurera en en-tête de vos documents officiels.
                </InfoTooltip>
              </span>
              <input
                className="champ-board"
                id="siret"
                name="siret"
                value={state.siret}
                onChange={(e) => update({ siret: e.target.value })}
                placeholder="812 456 789 00021"
                inputMode="numeric"
                pattern="\d{14}"
                aria-invalid={Boolean(errors?.siret)}
                aria-describedby={
                  errors?.siret ? "siret-aide siret-erreur" : "siret-aide"
                }
              />
              <p
                id="siret-aide"
                className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
              >
                14 chiffres — facultatif
              </p>
              {errors?.siret && (
                <p
                  id="siret-erreur"
                  className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
                >
                  {errors.siret}
                </p>
              )}
            </div>
          </div>
        </SectionChamps>
      </section>

      <section className="carte-board px-7 py-6 sm:px-8">
        <SectionChamps titre="Le site principal">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4">
            <ChampBoard
              id="adresseRue"
              name="adresseRue"
              label="Numéro et rue"
              requis
              value={state.adresseRue}
              onChange={(e) => update({ adresseRue: e.target.value })}
              placeholder="12 rue des Halles"
              autoComplete="street-address"
              // Le refus client vise `adresseRue`, le refus serveur porte sur
              // l'adresse recomposée : les deux se rendent au même champ.
              erreur={messagePour("adresseRue") ?? errors?.adresse}
            />

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-[160px_1fr]">
              <ChampBoard
                id="adresseCodePostal"
                name="adresseCodePostal"
                label="Code postal"
                requis
                value={state.adresseCodePostal}
                onChange={(e) =>
                  update({
                    adresseCodePostal: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 5),
                  })
                }
                placeholder="75011"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                erreur={messagePour("adresseCodePostal")}
                // Le refus serveur porte sur l'adresse recomposée : son texte
                // s'affiche sur la rue, mais les trois champs se marquent
                // invalides — c'est l'ensemble qui l'est.
                aria-invalid={Boolean(
                  messagePour("adresseCodePostal") ?? errors?.adresse,
                )}
              />
              <ChampBoard
                id="adresseVille"
                name="adresseVille"
                label="Ville"
                requis
                value={state.adresseVille}
                onChange={(e) => update({ adresseVille: e.target.value })}
                placeholder="Paris"
                autoComplete="address-level2"
                erreur={messagePour("adresseVille")}
                aria-invalid={Boolean(messagePour("adresseVille") ?? errors?.adresse)}
              />
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div>
                <span className="flex items-center gap-1">
                  <label className="label-board" htmlFor="codeNaf">
                    Code NAF *
                  </label>
                  <InfoTooltip>
                    Code INSEE qui figure sur votre avis de situation.
                    Détermine votre secteur et pré-remplit les risques types
                    pour le DUERP.
                  </InfoTooltip>
                </span>
                <input
                  className="champ-board uppercase"
                  id="codeNaf"
                  name="codeNaf"
                  required
                  value={state.codeNaf}
                  onChange={(e) =>
                    update({ codeNaf: e.target.value.toUpperCase() })
                  }
                  placeholder="56.10A"
                  // `aria-invalid` ne signale plus l'absence de référentiel :
                  // le champ est correctement rempli, c'est le produit qui
                  // n'a pas de secteur pour ce code. Le marquer invalide
                  // faisait dire à la technologie d'assistance qu'il y avait
                  // une saisie à corriger, alors qu'il n'y a rien à corriger.
                  aria-invalid={Boolean(erreurNaf)}
                  // Les trois messages de ce champ lui sont chaînés, et non
                  // le seul premier : le panneau « secteur non couvert »
                  // annonce que l'inscription ne peut pas aboutir. Le champ
                  // passait « invalide » sans que rien ne dise pourquoi.
                  aria-describedby={
                    [
                      erreurNaf ? "codeNaf-erreur" : null,
                      scope?.status === "ok" && !erreurNaf
                        ? "codeNaf-secteur"
                        : null,
                      scope?.status === "sans_referentiel" && !erreurNaf
                        ? "codeNaf-sans-referentiel"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                />
                {erreurNaf && (
                  <p
                    id="codeNaf-erreur"
                    className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
                  >
                    {erreurNaf}
                  </p>
                )}
                {/* « Secteur reconnu » est un fait de saisie — ce que le code
                    tapé désigne —, pas un jugement de conformité : le vert du
                    board (« fait ») convient, et la coche évite que
                    l'information ne tienne qu'à la couleur. */}
                {scope?.status === "ok" && !erreurNaf ? (
                  <p
                    id="codeNaf-secteur"
                    className="m-0 mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[color:var(--board-green-ink)]"
                  >
                    <Check aria-hidden className="size-3.5" />
                    Secteur reconnu : {scope.secteurNom}
                  </p>
                ) : null}
                {/* Ambre, et non plus l'encre signal : rien n'est en faute
                    et rien ne bloque. Le rouge disait « corrigez ce champ »
                    et fermait la porte ; l'ambre dit « sachez ceci », comme
                    le bandeau de couverture le fait pour une question
                    ouverte. `role="status"` et non `role="alert"`, pour la
                    même raison — ce n'est pas une erreur à annoncer, c'est un
                    fait à lire. */}
                {scope?.status === "sans_referentiel" && !erreurNaf ? (
                  <div
                    id="codeNaf-sans-referentiel"
                    role="status"
                    className="mt-2 rounded-[18px] bg-[color:var(--board-amber-wash)] px-3.5 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-amber-ink)] shadow-[inset_0_0_0_1px_var(--board-amber)]"
                  >
                    <p className="m-0 font-semibold">
                      Pas de référentiel de risques types pour ce secteur
                    </p>
                    <p className="m-0 mt-1">{scope.constat}</p>
                    <p className="m-0 mt-2 text-[color:var(--board-slate-ink)]">
                      {scope.consequence}
                    </p>
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS_NAF.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => update({ codeNaf: s.code })}
                      className="rounded-full bg-[color:var(--board-slate-pale)] px-3 py-1 text-[12px] font-medium text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)]"
                    >
                      {s.code} · {s.libelle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saisie en texte plutôt qu'en `type="number"` : la molette
                  d'un champ nombre modifie une valeur déjà saisie sans qu'on
                  s'en aperçoive (charte § 5). Les bornes restent tenues par
                  Zod côté serveur. */}
              <ChampBoard
                id="effectifSurSite"
                name="effectifSurSite"
                label="Effectif travailleur"
                requis
                inputMode="numeric"
                value={state.effectifSurSite}
                onChange={(e) => update({ effectifSurSite: e.target.value })}
                placeholder="8"
                aide="Salariés + apprentis présents régulièrement. Rojer s'arrête à 50. À partir de 50 salariés, le document unique alimente aussi un programme annuel de prévention (art. L. 4121-3-1) que l'outil ne porte pas."
                // Le refus de périmètre n'est pas rendu ici mais dans le bloc
                // ci-dessous : il tient trois lignes et il porte une icône.
                erreur={refus ? undefined : messagePour("effectifSurSite")}
                // L'aide EST reprise dans la chaîne : `ChampBoard` la
                // construit lui-même, et ce `aria-describedby` la remplace
                // (il est étalé après). L'omettre ferait taire « salariés +
                // apprentis présents régulièrement » pour qui écoute le
                // champ — précisément là où le refus rend la définition de
                // l'effectif la plus utile.
                aria-describedby={
                  refus
                    ? "effectifSurSite-aide effectifSurSite-refus"
                    : undefined
                }
              />
            </div>

            {/* Le REFUS. Il ferme la porte — au-delà de cinquante travailleurs
                l'outil ne sert plus le dossier (ADR-025 § 1, ADR-031) —, donc
                il se peint comme un refus : voile rose, encre signal, et une
                icône, parce qu'une signalétique qui tient à la seule couleur
                disparaît en niveaux de gris et pour qui n'y voit pas (charte,
                interdit 10). Il était rendu dans le même creux ardoise que le
                repère de seuil au-dessus : le refus qui arrête tout se lisait
                plus doucement qu'un champ oublié.

                `role="status"` et non `"alert"` : il est là avant qu'on ait
                rien tenté, il n'interrompt rien. C'est le bouton « Suivant »,
                désactivé par `WizardShell`, qui dit que la porte est fermée —
                et le refus n'est donc plus répété en rouge après le clic. */}
            {refus ? (
              <div
                id="effectifSurSite-refus"
                role="status"
                className="flex items-start gap-2.5 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 shadow-[inset_0_0_0_1px_var(--board-signal-line)]"
              >
                <OctagonX
                  aria-hidden
                  className="mt-px size-4 flex-none text-[color:var(--board-signal-ink)]"
                />
                <p className="m-0 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-signal-ink)]">
                  {refus.message}
                </p>
              </div>
            ) : null}

            {/* Rappel de seuil : un repère de lecture, pas un état. Le creux
                ardoise le pose sans lui prêter de couleur — un fond vert y
                dirait « fait », un fond ambre « attention ». */}
            {repere ? (
              <BlocCreux>
                <strong className="block text-[13.5px] font-semibold text-[color:var(--board-ink)]">
                  {repere.titre}
                </strong>
                <span className="mt-1 block max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {repere.corps}
                </span>
              </BlocCreux>
            ) : null}
          </div>
        </SectionChamps>
      </section>
    </div>
  );
}

/**
 * Le repère de lecture qui accompagne l'effectif saisi — et **rien d'autre**.
 *
 * Il portait aussi le refus au-delà de cinquante, dans les mêmes mots gris et
 * la même boîte que les deux seuils informatifs. Un refus qui arrête la
 * création se lisait donc dans le registre d'un rappel, puis revenait en
 * rouge au clic, dans une seconde formulation. Le refus vit maintenant dans
 * `refusEffectif` (`validation.ts`) : un seul texte, une seule fois, et dans
 * le registre du refus.
 */
function repereEffectif(
  v: string,
): { titre: string; corps: string } | null {
  // Entier seulement : « 50,5 salariés » n'est pas un effectif, et une saisie
  // non entière est de toute façon refusée au passage d'étape. Le repère se
  // tait plutôt que de commenter un nombre qui ne veut rien dire.
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  if (n < 11) {
    return {
      titre: `${n} salarié${n > 1 ? "s" : ""}`,
      corps:
        "Sous onze salariés : pas de comité social et économique (art. L. 2311-2), et la mise à jour annuelle du document unique ne s'applique pas (art. R. 4121-2, 1°). Ces seuils se comptent sur l'entreprise, apprentis non compris (art. L. 1111-3).",
    };
  }
  // Au-delà d'EFFECTIF_MAX, l'appelant n'arrive jamais ici : `refusEffectif`
  // a déjà répondu, et c'est lui qui porte le texte.
  return {
    titre: `${n} salariés`,
    corps:
      "À partir de onze salariés : un comité social et économique est mis en place si cet effectif est atteint pendant douze mois consécutifs (art. L. 2311-2), et le document unique est mis à jour au moins chaque année (art. R. 4121-2, 1°). Ces seuils se comptent sur l'entreprise, apprentis non compris (art. L. 1111-3).",
  };
}
