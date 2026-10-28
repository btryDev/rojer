import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AjouterUniteForm } from "@/components/duerps/AjouterUniteForm";
import { UniteRow } from "@/components/duerps/UniteRow";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { etapesDuDuerp } from "@/lib/duerps/etapes";
import { getDuerp } from "@/lib/duerps/queries";

export default async function UnitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unitesVisibles.length > 0;
  const etapes = etapesDuDuerp(duerp, "unites");

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      <header className="max-w-[var(--board-mesure)]">
        <p className="board-eyebrow m-0 inline-flex items-center text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Unités de travail
          <InfoTooltip align="left">
            Une « unité de travail » regroupe des salariés exposés aux mêmes
            risques. Ça peut être un poste (ex. accueil), une zone (ex.
            cuisine) ou une activité (ex. livraison). L&apos;évaluation se
            fait unité par unité.
          </InfoTooltip>
        </p>
        <h2 className="board-titre m-0 mt-3 text-[clamp(23px,2.1vw,30px)]">
          Vérifiez, ajustez, complétez.
        </h2>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Une unité regroupe des salariés exposés aux mêmes risques (un poste,
          une zone, une activité). Les unités ci-dessous ont été pré-remplies
          selon votre secteur. Vous pouvez les renommer, les supprimer, ou en
          ajouter.
        </p>
      </header>

      <section className="carte-board overflow-clip">
        <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] tabular-nums text-[color:var(--board-slate-soft)]">
            {String(unitesVisibles.length).padStart(2, "0")} unité
            {unitesVisibles.length > 1 ? "s" : ""}
          </p>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Modifiables
          </p>
        </div>

        {unitesVisibles.length === 0 ? (
          <p className="m-0 px-7 py-8 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
            Aucune unité de travail. Ajoutez-en au moins une pour continuer.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
            {unitesVisibles.map((u) => (
              <UniteRow
                key={u.id}
                id={u.id}
                nom={u.nom}
                description={u.description}
                nombreRisques={u.risques.length}
              />
            ))}
          </ul>
        )}

        <div className="border-t border-[color:var(--board-slate-line)]">
          <AjouterUniteForm duerpId={id} />
        </div>
      </section>

      <div className="flex items-center justify-end">
        {/* Un vrai `disabled` plutôt qu'un `aria-disabled` posé sur un lien :
            sans `role`, l'attribut n'est pas exposé (interdit 20). Le lien
            reste un lien tant qu'il mène quelque part, et devient un bouton
            inerte et annoncé comme tel quand aucune unité n'est saisie. */}
        {unitesOk ? (
          <Link
            href={`/duerp/${id}/risques`}
            className={buttonVariants({ variant: "board", size: "board" })}
          >
            Étape suivante : risques →
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={buttonVariants({ variant: "board", size: "board" })}
          >
            Étape suivante : risques →
          </button>
        )}
      </div>
    </div>
  );
}
