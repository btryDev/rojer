import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormulairePrestataire } from "@/components/prestataires/FormulairePrestataire";
import { requireEtablissement } from "@/lib/auth/scope";
import { creerPrestataire } from "@/lib/prestataires/actions";

export default async function NouveauPrestatairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);

  const action = creerPrestataire.bind(null, id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/prestataires`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Prestataires
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Ajouter un prestataire
        </h1>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          L&apos;identité et le contact suffisent pour commencer —{" "}
          {etablissement.raisonDisplay}{" "}
          pourra recevoir les pièces plus tard.
          Les joindre dès maintenant vous évite d&apos;avoir à les redemander le
          jour d&apos;un contrôle.
        </p>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <FormulairePrestataire etablissementId={id} action={action} />
        </div>
      </div>
    </main>
  );
}
