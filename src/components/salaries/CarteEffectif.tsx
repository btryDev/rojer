"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import type { EffectifsActionState } from "@/lib/entreprises/effectif-actions";
import type { EffectifsDuSite } from "@/lib/entreprises/effectif-queries";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";

/**
 * L'effectif se déclare ici, et nulle part ailleurs (2026-11-03, décision de
 * la propriétaire) : un seul chiffre par établissement, ses apprentis, et les
 * salariés de la société que Rojer ne suit pas. La société en est la somme,
 * apprentis non compris (L. 1111-3) — c'est elle qui fixe le CSE, le
 * règlement intérieur et la borne de Rojer.
 */
export function CarteEffectif({
  action,
  effectifs,
}: {
  action: (prev: EffectifsActionState, formData: FormData) => Promise<EffectifsActionState>;
  effectifs: EffectifsDuSite;
}) {
  const [state, formAction, pending] = useActionState<EffectifsActionState, FormData>(action, {
    status: "idle",
  });
  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;
  // Après un refus, React remet le formulaire à ses valeurs par défaut : on
  // lui rend ce qui avait été saisi, pour que le refus se lise à côté.
  const saisie = state.status === "error" ? state.saisie : undefined;
  const valeur = (champ: "effectifSurSite" | "apprentisSurSite" | "effectifHorsRojer") =>
    saisie?.[champ] ?? String(effectifs[champ]);

  return (
    <section id="effectif" className="carte-board scroll-mt-6 px-7 py-6 sm:px-8">
      <div className="flex flex-col gap-1">
        <h2 className="board-titre m-0 text-[20px]">Effectif</h2>
        <p className="m-0 max-w-[var(--board-mesure)] text-[13px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Votre société compte{" "}
          <strong className="font-mono font-semibold tabular-nums text-[color:var(--board-ink)]">
            {effectifs.entreprise}
          </strong>{" "}
          salarié{effectifs.entreprise > 1 ? "s" : ""}, tous établissements confondus, apprentis non
          compris
          {effectifs.nombreAutresSites > 0
            ? ` — dont ${effectifs.autresSites} dans ${effectifs.nombreAutresSites > 1 ? `ses ${effectifs.nombreAutresSites} autres établissements suivis` : "son autre établissement suivi"}`
            : ""}
          . C&apos;est sur ce nombre que se comptent le comité social et économique, le règlement
          intérieur et la limite de Rojer, {EFFECTIF_MAX} salariés.
        </p>
      </div>

      <form
        // Une clé par réponse : les champs reprennent leurs valeurs par défaut.
        key={JSON.stringify(saisie ?? effectifs)}
        action={formAction}
        className="mt-5 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Saisie texte : la molette d'un champ nombre change une valeur
              sans qu'on le voie (charte § 5). */}
          <ChampBoard
            id="effectifSurSite"
            name="effectifSurSite"
            label="Travailleurs dans l'établissement"
            requis
            type="text"
            inputMode="numeric"
            defaultValue={valeur("effectifSurSite")}
            erreur={err("effectifSurSite")}
            aide="Salariés et apprentis qui y travaillent régulièrement."
          />
          <ChampBoard
            id="apprentisSurSite"
            name="apprentisSurSite"
            label="Dont apprentis et contrats de professionnalisation"
            requis
            type="text"
            inputMode="numeric"
            defaultValue={valeur("apprentisSurSite")}
            erreur={err("apprentisSurSite")}
            aide="Ils ne comptent pas dans l'effectif de la société (art. L. 1111-3)."
          />
          <ChampBoard
            id="effectifHorsRojer"
            name="effectifHorsRojer"
            label="Salariés de la société hors Rojer"
            requis
            type="text"
            inputMode="numeric"
            defaultValue={valeur("effectifHorsRojer")}
            erreur={err("effectifHorsRojer")}
            aide="Dans ses autres établissements, que vous ne suivez pas ici. 0 si aucun."
          />
        </div>

        {state.status === "error" && !state.fieldErrors ? (
          <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" ? (
          <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">Enregistré.</p>
        ) : null}

        <div>
          <Button variant="board" size="board" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer l'effectif"}
          </Button>
        </div>
      </form>
    </section>
  );
}

/**
 * Les personnes de l'effectif qui n'ont pas encore de fiche : des places,
 * pas des fiches — rien n'est créé en base tant qu'on ne remplit pas.
 */
export function PlacesARenseigner({ nombre, href }: { nombre: number; href: string }) {
  if (nombre <= 0) return null;
  return (
    <>
      {Array.from({ length: nombre }, (_, i) => (
        <Link
          key={i}
          href={href}
          className="flex min-h-[96px] items-center justify-center rounded-[30px] border border-dashed border-[color:var(--board-slate-line)] px-6 py-5 text-[13px] text-[color:var(--board-slate-mid)] hover:border-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
        >
          Personne à renseigner
        </Link>
      ))}
    </>
  );
}
