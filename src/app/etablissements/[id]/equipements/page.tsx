import { notFound } from "next/navigation";
import { EmptyState } from "@/components/layout/EmptyState";
import { BandeauParc } from "@/components/equipements/BandeauParc";
import {
  CarteCategorie,
  urgenceCategorie,
  type AppareilListe,
} from "@/components/equipements/CarteCategorie";
import { PreRemplissagePanel } from "@/components/equipements/PreRemplissagePanel";
import { getEtablissement } from "@/lib/etablissements/queries";
import {
  grouperParCategorie,
  listerEquipementsDeLEtablissement,
} from "@/lib/equipements/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import {
  estMultiBatiments,
  resoudreFiltreBatiment,
  restreindreAuBatiment,
} from "@/lib/batiments/filtre";
import {
  contexteDesSuggestions,
  suggererEquipements,
} from "@/lib/equipements/pre-remplissage";
import {
  etatVerificationsParEquipement,
  resumerEquipement,
} from "@/lib/equipements/etat-verifications";
import {
  LIBELLE_SANS_ECHEANCE,
  EXPLICATION_SANS_ECHEANCE,
  equipementsSansEcheance,
} from "@/lib/equipements/hors-referentiel";
import { avecProvenance, origineDepuis } from "@/lib/navigation/provenance";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

export default async function EquipementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bienvenue?: string; batiment?: string }>;
}) {
  const { id } = await params;
  const { bienvenue, batiment } = await searchParams;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  const base = `/etablissements/${id}`;

  // Le filtre par bâtiment est un réglage d'écran : il vit dans l'URL, il
  // n'apparaît qu'à partir de deux bâtiments, et un identifiant inconnu
  // vaut « tous » (ADR-019 ; la règle est dans `lib/batiments/filtre`, une
  // fois pour les trois écrans qui filtrent). Il se résout **avant** tout
  // le reste : c'est lui qui borne le parc affiché, donc les compteurs du
  // bandeau, les sections et leur tri par urgence. Appliqué après, il
  // laisserait un en-tête et un ordre calculés sur un autre périmètre.
  const batiments = await listerBatimentsDeLEtablissement(id);
  const multiBatiments = estMultiBatiments(batiments);
  const batimentFiltre = resoudreFiltreBatiment(batiments, batiment);

  // Les liens vers une fiche emportent cet écran : le retour ramènera ici,
  // pas au parent canonique par défaut (ADR-014) — et dans le bâtiment
  // qu'on regardait, sinon le retour rouvrirait tout le parc en silence.
  // `bienvenue` est délibérément écarté de la provenance : embarqué dans
  // les liens de fiche, il ramenait la bannière d'accueil à chaque retour
  // sur la liste — alors qu'elle est censée disparaître à la première
  // navigation. Le bâtiment, lui, est un réglage et non un événement : il
  // se reconduit.
  const origine = origineDepuis(
    `${base}/equipements`,
    batimentFiltre ? { batiment: batimentFiltre } : {},
  );

  const [equipements, etatsVerifs, sansEcheance] = await Promise.all([
    listerEquipementsDeLEtablissement(id),
    // Le parc ne disait rien de son état de vérification : on lisait un
    // inventaire, pas une situation.
    etatVerificationsParEquipement(id),
    // Et le parc ne disait rien du silence : un appareil pour lequel le
    // référentiel ne produit aucune échéance est rendu comme un appareil à
    // jour — c'est-à-dire comme une réponse alors que personne n'en a
    // donné (cf. `hors-referentiel.ts`).
    equipementsSansEcheance(id),
  ]);

  const equipementsAffiches = restreindreAuBatiment(equipements, batimentFiltre);
  const parCategorie = grouperParCategorie(equipementsAffiches);

  const suggestions = suggererEquipements(contexteDesSuggestions(etab));

  // Les chiffres du bandeau ne comptent que le parc AFFICHÉ. Le compteur
  // de l'établissement (`compterEtatCalendrier`) embrasse aussi les
  // vérifications des équipements retirés — elles survivent au retrait dès
  // qu'elles portent un rapport ou une action (ADR-012). Après le retrait
  // d'un appareil en retard, le bandeau annonçait « 1 en retard » alors
  // qu'aucune carte de l'écran n'en montrait : un en-tête ne doit jamais
  // contredire ce qu'il coiffe.
  //
  // Un bâtiment filtré, c'est la même exigence d'un cran plus fin : la
  // somme se fait sur les appareils affichés, donc le bandeau suit le
  // filtre — les trois chiffres comme le total. La légende sous le
  // sélecteur l'annonce en toutes lettres, dans les deux sens.
  const compteurs = equipementsAffiches.reduce(
    (acc, eq) => {
      const e = etatsVerifs.get(eq.id);
      return {
        enRetard: acc.enRetard + (e?.enRetard ?? 0),
        proches: acc.proches + (e?.proches ?? 0),
        aPlanifier: acc.aPlanifier + (e?.aPlanifier ?? 0),
      };
    },
    { enRetard: 0, proches: 0, aPlanifier: 0 },
  );

  // Les suggestions se lisent sur le parc **entier** : une catégorie déjà
  // déclarée dans un autre bâtiment n'est pas à examiner, et le filtre ne
  // doit pas la faire réapparaître.
  const dejaDeclarees = new Set(equipements.map((e) => e.categorie));
  const suggestionsRestantes = suggestions.filter(
    (s) => !dejaDeclarees.has(s.categorie),
  );

  // Le bâtiment est le « où » qui discrimine dès qu'il y en a deux — sauf
  // quand le filtre en a déjà nommé un en tête d'écran : il se redirait
  // alors à l'identique sur chaque carte, et la localisation, seule
  // précision qui distingue encore deux appareils, passerait en second.
  const montrerBatiment = multiBatiments && !batimentFiltre;

  // Ajouter depuis un parc filtré ouvre le formulaire sur ce bâtiment :
  // sinon le nouvel appareil part au bâtiment principal et disparaît de
  // l'écran d'où on vient de le déclarer.
  const suffixeBatiment = batimentFiltre
    ? `batiment=${encodeURIComponent(batimentFiltre)}`
    : "";
  const hrefAjouter = suffixeBatiment
    ? `${base}/equipements/nouveau?${suffixeBatiment}`
    : `${base}/equipements/nouveau`;

  // Une section par catégorie, la plus en peine en tête : sur un parc de
  // quinze appareils, l'ordre alphabétique enterrait le seul retard.
  const sections = [...parCategorie.entries()]
    .map(([categorie, liste]) => {
      const appareils: AppareilListe[] = liste.map((eq) => ({
        id: eq.id,
        libelle: eq.libelle,
        // Le « où » de la vitrine, à deux étages depuis l'ADR-019 : un
        // bâtiment, et une précision dans ce bâtiment.
        lieu: montrerBatiment ? eq.batiment.nom : eq.localisation,
        precision: montrerBatiment ? eq.localisation : null,
        resume: resumerEquipement(etatsVerifs.get(eq.id)),
        // Le motif se pose AU-DESSUS des signaux, il ne les remplace pas :
        // un appareil sans échéance à venir garde ses vérifications
        // réalisées, et c'est la seule chose qu'il ait à montrer en cas de
        // contrôle.
        horsReferentiel: (() => {
          const motif = sansEcheance.get(eq.id);
          return motif
            ? {
                libelle: LIBELLE_SANS_ECHEANCE[motif],
                explication: EXPLICATION_SANS_ECHEANCE[motif],
              }
            : null;
        })(),
        href: avecProvenance(`${base}/equipements/${eq.id}`, origine),
      }));
      const periodicites = liste.flatMap(
        (eq) => etatsVerifs.get(eq.id)?.periodicites ?? [],
      );
      return {
        categorie: categorie as CategorieEquipement,
        appareils,
        periodicites,
      };
    })
    .sort(
      (a, b) => urgenceCategorie(b.appareils) - urgenceCategorie(a.appareils),
    );

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <BandeauParc
        hrefRetour={base}
        hrefCalendrier={`${base}/calendrier`}
        enRetard={compteurs.enRetard}
        proches={compteurs.proches}
        aPlanifier={compteurs.aPlanifier}
        total={equipementsAffiches.length}
        hrefAjouter={hrefAjouter}
        suggestions={
          suggestionsRestantes.length > 0
            ? { nombre: suggestionsRestantes.length, href: "#suggestions" }
            : null
        }
        filtreBatiment={
          multiBatiments
            ? {
                baseHref: `${base}/equipements`,
                batiments,
                actif: batimentFiltre,
              }
            : null
        }
      />

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {/* Bandeau de continuité wizard → équipements (éphémère : le
            paramètre disparaît à la navigation suivante). */}
        {bienvenue === "1" && (
          <div className="carte-board px-7 py-5 sm:px-8">
            <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--board-ink)]">
              <strong>Votre espace est créé.</strong>{" "}
              Dernière étape de la mise
              en place&nbsp;: déclarez les équipements présents chez vous. Votre
              calendrier de vérifications se génère dans la foulée — chaque
              échéance citera son texte réglementaire.
            </p>
          </div>
        )}

        {suggestionsRestantes.length > 0 && (
          <div id="suggestions" className="scroll-mt-6">
            <PreRemplissagePanel
              etablissementId={id}
              suggestions={suggestionsRestantes}
            />
          </div>
        )}

        {equipements.length === 0 ? (
          <EmptyState
            titre="Les équipements de votre établissement alimentent tout le reste"
            pourquoi="Électricité, extincteurs, hotte, ascenseur… Chaque équipement déclenche des vérifications périodiques qui doivent être faites par un organisme ou un technicien. C'est la déclaration ici qui dit à l'outil quoi mettre dans votre calendrier."
            quoiFaire={
              suggestionsRestantes.length > 0
                ? "parcourez les suggestions ci-dessus (elles sont basées sur votre secteur d'activité) et cochez celles qui s'appliquent, ou ajoutez manuellement via le bouton en haut."
                : "ajoutez un premier équipement via le bouton « + Ajouter un équipement » en haut de la page."
            }
            cta="Ajouter un équipement"
            ctaHref={hrefAjouter}
          />
        ) : equipementsAffiches.length === 0 ? (
          /* Le parc n'est pas vide, ce bâtiment l'est : deux situations
             qui ne se disent pas de la même façon. La seconde ne mérite
             pas la page d'accueil du parc, seulement une phrase — et le
             sélecteur, juste au-dessus, reste la sortie. */
          <p className="carte-board px-7 py-5 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
            Aucun équipement déclaré dans cette zone. Un appareil se déplace
            depuis sa fiche, en changeant sa zone.
          </p>
        ) : (
          sections.map((s) => (
            <CarteCategorie
              key={s.categorie}
              categorie={s.categorie}
              appareils={s.appareils}
              periodicites={s.periodicites}
              hrefAjouter={`${base}/equipements/nouveau?categorie=${s.categorie}${
                suffixeBatiment ? `&${suffixeBatiment}` : ""
              }`}
            />
          ))
        )}
      </div>
    </main>
  );
}
