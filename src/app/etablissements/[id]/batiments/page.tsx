import { WhyCard } from "@/components/ui-kit";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BatimentsManager } from "@/components/batiments/BatimentsManager";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";

export default async function BatimentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireEtablissement(id);
  const batiments = await listerBatimentsDeLEtablissement(id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <EnTetePage
        item="batiments"
        description="Les endroits où se découpe votre établissement — une réserve, un atelier, une annexe —, trois au plus. Chaque équipement s'y situe, et vos échéances se lisent zone par zone."
      />

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        <WhyCard
          charte="board"
          kicker="Bon à savoir"
          titre="Une zone est un lieu, pas un statut"
          tonalite="info"
        >
          <p className="m-0">
            Vos obligations — notamment celles liées au classement ERP — sont
            calculées pour l&apos;établissement dans son ensemble et
            s&apos;appliquent à toutes ses zones. Si l&apos;une d&apos;elles
            n&apos;est pas ouverte au public ou relève d&apos;un autre régime,
            signalez-le-nous : ce cas n&apos;est pas encore distingué.
          </p>
        </WhyCard>

        <BatimentsManager etablissementId={id} batiments={batiments} />
      </div>
    </main>
  );
}
