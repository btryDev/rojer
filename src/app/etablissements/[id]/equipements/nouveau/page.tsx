import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { questionsExigeesParCategorie } from "@/lib/equipements/reponses-exigees";
import { EquipementForm } from "@/components/equipements/EquipementForm";
import { creerEquipement } from "@/lib/equipements/actions";
import { getEtablissement } from "@/lib/etablissements/queries";
import { CATEGORIES_EQUIPEMENT } from "@/lib/equipements/schema";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import { resoudreFiltreBatiment } from "@/lib/batiments/filtre";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

export default async function NouvelEquipementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ categorie?: string; batiment?: string }>;
}) {
  const { id } = await params;
  const { categorie, batiment } = await searchParams;
  const etab = await getEtablissement(id);
  if (!etab) notFound();
  const batiments = await listerBatimentsDeLEtablissement(id);

  // La grille du parc propose « Ajouter » famille par famille : le
  // formulaire s'ouvre alors sur la bonne catégorie. Une valeur forgée est
  // ignorée plutôt que passée au formulaire — la liste fermée fait foi.
  const categorieInitiale = CATEGORIES_EQUIPEMENT.includes(
    categorie as CategorieEquipement,
  )
    ? (categorie as CategorieEquipement)
    : undefined;

  // Le parc se filtre par bâtiment : ajouter depuis un parc filtré ouvre
  // le formulaire sur ce bâtiment-là. Même règle que le filtre, donc même
  // fonction — un identifiant inconnu ne présélectionne rien, et le
  // formulaire retombe sur le bâtiment principal.
  const batimentInitial = resoudreFiltreBatiment(batiments, batiment);

  const action = creerEquipement.bind(null, id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/equipements`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Équipements de {etab.raisonDisplay}
        </Link>
        {/* Le sur-titre « Nouvel équipement » redisait le titre : le board
            ne pose pas de sur-titre quand le titre nomme déjà la vue. */}
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Déclarer un équipement
        </h1>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <EquipementForm
            action={action}
            batiments={batiments}
            valeursInitiales={
              categorieInitiale || batimentInitial
                ? {
                    ...(categorieInitiale
                      ? { categorie: categorieInitiale }
                      : {}),
                    ...(batimentInitial ? { batimentId: batimentInitial } : {}),
                  }
                : undefined
            }
            estERP={etab.estERP}
            questionsExigees={questionsExigeesParCategorie()}
            libelleSubmit="Créer l'équipement"
            labelAnnuler={{
              libelle: "Annuler",
              href: `/etablissements/${id}/equipements`,
            }}
          />
        </div>
      </div>
    </main>
  );
}
