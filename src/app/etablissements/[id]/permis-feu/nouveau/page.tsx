import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormulairePermisFeu } from "@/components/permis-feu/FormulairePermisFeu";
import { requireEtablissement } from "@/lib/auth/scope";
import { listPrestataires } from "@/lib/prestataires/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";

export const metadata = {
  title: "Nouveau permis de feu",
};

/**
 * L'écran de saisie d'un permis de feu, en charte board — même gabarit que
 * `prestataires/nouveau` : bandeau bord à bord, puis une seule carte qui
 * porte le formulaire. Le lien « Retour à la liste → » de la topbar papier
 * a disparu : le fil de retour du bandeau et le bouton « Annuler » du
 * formulaire disent déjà la même sortie, deux fois valait mieux que trois.
 */
export default async function NouveauPermisFeuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEtablissement(id);
  const prestatairesAnnuaire = await listPrestataires(id);
  const batiments = await listerBatimentsDeLEtablissement(id);

  // Filtre sur les domaines pertinents pour du point chaud : BTP + entretien
  const prestataires = prestatairesAnnuaire
    .filter((p) =>
      p.domaines.some((d) =>
        ["travaux_btp", "entretien_general", "autre"].includes(d),
      ) || p.domaines.length === 0,
    )
    .map((p) => ({
      id: p.id,
      raisonSociale: p.raisonSociale,
      contactNom: p.contactNom,
      contactEmail: p.contactEmail,
    }));

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/permis-feu`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Permis de feu
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Nouveau permis de feu
        </h1>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          À créer avant l&apos;arrivée du prestataire sur site.
        </p>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <FormulairePermisFeu
            etablissementId={id}
            prestataires={prestataires}
            batiments={batiments}
          />
        </div>
      </div>
    </main>
  );
}
