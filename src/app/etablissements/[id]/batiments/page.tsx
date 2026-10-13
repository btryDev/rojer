import { FilAriane } from "@/components/navigation/FilAriane";
import { WhyCard } from "@/components/ui-kit";
import { BatimentsManager } from "@/components/batiments/BatimentsManager";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";

export default async function BatimentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const batiments = await listerBatimentsDeLEtablissement(id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <div className="min-w-0">
          <FilAriane
            crumbs={[
              { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
              { label: "Zones" },
            ]}
          />
          <h1 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
            Zones
          </h1>
          <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Si votre établissement se découpe en plusieurs endroits — une
            réserve, un atelier, une annexe — déclarez-les ici, jusqu&apos;à
            trois. Vous pourrez ensuite situer chaque équipement et lire vos
            échéances zone par zone.
          </p>
        </div>
      </header>

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
