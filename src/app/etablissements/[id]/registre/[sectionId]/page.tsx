import { notFound } from "next/navigation";
import { CarteFiche, CorpsFiche, EcranFiche } from "@/components/ui-kit";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import {
  ContenuTenuAilleurs,
  CorpsFicheRegistre,
  NavigationFiches,
  TeteFicheRegistre,
  type FicheVoisine,
} from "@/components/registre";
import { alimentationDeLaPartie } from "@/lib/registre/alimentation";
import {
  completudeDeLaFiche,
  tonCompletude,
} from "@/lib/registre/completude";
import { saisiePourSection } from "@/lib/registre/champs";
import { aplatirRegistre } from "@/lib/registre/composition";
import { composerRegistreDeLEtablissement } from "@/lib/registre/queries";
import { lireContenuTenuAilleurs } from "@/lib/registre/contenu-ailleurs";
import { ajouterLigneJournal, enregistrerFiche } from "@/lib/registre/actions";
import { avecProvenance, lireProvenance } from "@/lib/navigation/provenance";

export default async function FicheDuRegistrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; sectionId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, sectionId } = await params;
  const { de } = await searchParams;

  const registre = await composerRegistreDeLEtablissement(id);
  if (!registre) notFound();

  const base = `/etablissements/${id}`;
  const hrefRegistre = `${base}/registre`;

  // L'ordre du document — celui où une commission feuillettera le registre.
  const fiches = aplatirRegistre(registre.parties);

  // La complétude de chaque fiche, calculée une fois : elle sert à celle-ci
  // et à désigner la prochaine qui attend des réponses.
  const etats = fiches.map(({ partie, due }) => ({
    partie,
    due,
    saisie: saisiePourSection(due.section.id),
    completude: completudeDeLaFiche(
      saisiePourSection(due.section.id),
      registre.contenus[due.section.id] ?? {},
      alimentationDeLaPartie(partie.id, base),
    ),
  }));

  const rang = etats.findIndex((e) => e.due.section.id === sectionId);
  // Une fiche qui n'est pas due pour cet établissement ne s'ouvre pas par son
  // URL : elle ne figure pas à son registre, et l'y laisser entrer donnerait
  // à saisir des réponses qui ne s'imprimeraient dans aucun document.
  if (rang === -1) notFound();
  const courante = etats[rang];

  const provenance = lireProvenance(de, id);
  const canonique = { href: hrefRegistre, label: LABEL_ITEM.registre };
  const depuisCetteFiche = `${hrefRegistre}/${sectionId}`;

  const action =
    courante.saisie?.forme === "journal"
      ? ajouterLigneJournal.bind(null, id, sectionId)
      : courante.saisie?.forme === "formulaire"
        ? enregistrerFiche.bind(null, id, sectionId)
        : undefined;

  // Ce que la fiche porte, quand un autre écran la tient.
  //
  // Elle se contentait d'un lien « allez voir ailleurs » : on ouvrait une
  // fiche de son propre registre pour y lire qu'elle était vide. Trente et
  // une des quarante-neuf fiches sont dans ce cas — c'était trente et un
  // culs-de-sac. On lit donc ici ce qui s'y imprimera, sans pouvoir le
  // modifier : la donnée se saisit là où elle vit.
  const ailleurs = await contenuTenuAilleurs();

  // La suivante qui **attend des réponses**, pas la suivante tout court :
  // marcher dans l'ordre du document ferait traverser les trente et une
  // fiches tenues par le parc et le calendrier, où il n'y a rien à faire.
  // On cherche après celle-ci, puis on reprend au début — sans jamais
  // reproposer celle qu'on regarde.
  const attend = (i: number) =>
    i !== rang && tonCompletude(etats[i].completude) === "attente";
  const indices = etats.map((_, i) => i);
  const ordreDeRecherche = [
    ...indices.filter((i) => i > rang),
    ...indices.filter((i) => i < rang),
  ];
  const iSuivante = ordreDeRecherche.find(attend);
  const suivante: FicheVoisine | null =
    iSuivante === undefined
      ? null
      : {
          titre: etats[iSuivante].due.section.titre,
          href: avecProvenance(
            `${hrefRegistre}/${etats[iSuivante].due.section.id}`,
            depuisCetteFiche,
          ),
        };
  // `attend` exclut la fiche affichée, parce que « suivante » ne doit jamais
  // reproposer celle qu'on regarde. Le COMPTE, lui, la comprend : sinon une
  // fiche vide dont aucune autre n'attend affiche « 0 restantes », et le pied
  // annonce que c'était la dernière à quelqu'un qui en regarde une non
  // remplie. Deux questions différentes, deux calculs différents.
  const restantes = indices.filter(
    (i) => tonCompletude(etats[i].completude) === "attente",
  ).length;

  return (
    <EcranFiche provenance={provenance} canonique={canonique}>
      <CorpsFiche
        principal={
          <>
            <TeteFicheRegistre
              partie={courante.partie}
              titre={courante.due.section.titre}
              attendu={courante.due.section.attendu}
              raisons={courante.due.raisons}
              aConfirmer={courante.due.aConfirmer}
              hrefFiche={`/etablissements/${id}/modifier`}
              completude={courante.completude}
            />
            <CorpsFicheRegistre
              saisie={courante.saisie}
              contenu={registre.contenus[sectionId]}
              completude={courante.completude}
              action={action}
              hrefEdition={avecProvenance(`${base}/modifier`, depuisCetteFiche)}
              ailleurs={ailleurs}
            />
          </>
        }
        cote={
          <CarteFiche titre="Et ensuite">
            <NavigationFiches
              suivante={suivante}
              restantes={restantes}
              hrefListe={hrefRegistre}
            />
            <p className="m-0 mt-4 border-t border-[color:var(--board-slate-line)] pt-3.5 text-[12px] text-[color:var(--board-slate-mid)]">
              Fiche <span className="tabular-nums">{rang + 1}</span> sur{" "}
              <span className="tabular-nums">{etats.length}</span>, dans
              l&apos;ordre du document.
            </p>
          </CarteFiche>
        }
      />
    </EcranFiche>
  );

  async function contenuTenuAilleurs() {
    // Quelle partie se lit dans quelle table est une connaissance du
    // registre : elle vit dans la lib, pas ici. La route n'ajoute que ce
    // qu'elle seule sait — d'où l'on vient, pour que le retour ramène à
    // cette fiche et non au parc.
    if (!courante.completude.alimentee) return undefined;
    const contenu = await lireContenuTenuAilleurs(
      id,
      courante.partie.id,
      courante.due.section,
    );
    if (!contenu) return undefined;
    return (
      <ContenuTenuAilleurs
        source={contenu.source}
        vide={contenu.vide}
        lignes={contenu.lignes.map((ligne) => ({
          ...ligne,
          href: ligne.href
            ? avecProvenance(ligne.href, depuisCetteFiche)
            : undefined,
        }))}
      />
    );
  }
}
