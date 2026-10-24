import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormulaireSalarie } from "@/components/salaries/FormulaireSalarie";
import { requireEtablissement } from "@/lib/auth/scope";
import { getSalarie } from "@/lib/salaries/queries";
import { modifierSalarie } from "@/lib/salaries/actions";

/**
 * Corriger la fiche d'une personne.
 *
 * L'écran manquait, et `modifierSalarie` existait sans appelant : une action
 * serveur exposée que rien n'atteignait. Or la rectification (art. 16 RGPD)
 * est promise à deux endroits — `docs/rgpd.md` § 5.2, et le texte
 * d'information que l'employeur remet à ses salariés, qui leur dit en toutes
 * lettres « une date erronée se corrige, demandez-la ». Elle ne se corrigeait
 * nulle part.
 */
export default async function ModifierSalariePage({
  params,
}: {
  params: Promise<{ id: string; salarieId: string }>;
}) {
  const { id, salarieId } = await params;
  await requireEtablissement(id);

  const s = await getSalarie(id, salarieId, new Date());
  if (!s) notFound();

  const action = modifierSalarie.bind(null, id, salarieId);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/equipe/${salarieId}`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {s.prenom} {s.nom}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Corriger la fiche
        </h1>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Une personne peut vous demander la correction de ce que vous
          enregistrez sur elle : c&apos;est un droit, et vous devez pouvoir
          l&apos;honorer. Les dates de ses titres se corrigent, elles, sur sa
          fiche.
        </p>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[760px] px-7 py-7 sm:px-8">
          <FormulaireSalarie
            etablissementId={id}
            action={action}
            defauts={{
              nom: s.nom,
              prenom: s.prenom,
              poste: s.poste,
              entreLe: s.entreLe,
            }}
            libelleSoumission="Enregistrer la correction"
          />
        </div>
      </div>
    </main>
  );
}
