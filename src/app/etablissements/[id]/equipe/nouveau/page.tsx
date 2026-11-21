import { LienRetour } from "@/components/duerps/LienRetour";
import { FormulaireSalarie } from "@/components/salaries/FormulaireSalarie";
import { requireEtablissement } from "@/lib/auth/scope";
import { creerSalarie } from "@/lib/salaries/actions";

export default async function NouveauSalariePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEtablissement(id);
  const action = creerSalarie.bind(null, id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <LienRetour href={`/etablissements/${id}/equipe`}>Équipe</LienRetour>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Ajouter une personne
        </h1>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Vous déclarerez ses titres à l&apos;étape suivante, sur sa fiche.
        </p>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[760px] px-7 py-7 sm:px-8">
          <FormulaireSalarie etablissementId={id} action={action} />
        </div>
      </div>
    </main>
  );
}
