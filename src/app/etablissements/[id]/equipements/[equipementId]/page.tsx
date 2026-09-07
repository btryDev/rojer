import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  AideEcran,
  CarteFiche,
  ChampFiche,
  ChampsFiche,
  CorpsFiche,
  EcranFiche,
  LegalBadge,
  LigneFiche,
  LignesFiche,
  PastilleFiche,
  TuileDate,
  TuileMuette,
} from "@/components/ui-kit";
import { HeroEquipement } from "@/components/equipements/HeroEquipement";
import {
  CarteDocuments,
  CartePhotos,
} from "@/components/equipements/PiecesEquipement";
import { SupprimerEquipementButton } from "@/components/equipements/SupprimerEquipementButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getFicheEquipement,
  lignesAFaire,
  lignesHistoire,
  obligationsDeclencheesParUnFait,
  obligationsDeLEquipement,
} from "@/lib/equipements/fiche";
import { caracteristiquesLisibles } from "@/lib/equipements/caracteristiques";
import {
  construireFrise,
  etatDuResultat,
  type JalonFrise,
} from "@/lib/equipements/frise";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { LABEL_PERIODICITE, LABEL_REALISATEUR } from "@/lib/calendrier/labels";
import { LABEL_RESULTAT } from "@/lib/rapports/schema";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import {
  formaterDateLongueFr,
  formaterJourMoisFr,
  formaterMoisAnneeFr,
  joursCivilsEntre,
} from "@/lib/dates";
import { avecProvenance, lireProvenance } from "@/lib/navigation/provenance";

/** Le délai d'une ligne « à faire », dit en jours plutôt qu'en date : un
 *  retard d'un jour et un retard de six mois n'appellent pas le même geste,
 *  et le lecteur ne devrait pas avoir à soustraire deux dates pour le voir. */
function delai(date: Date | null, maintenant: Date): string {
  if (!date) return "sans date convenue";
  const jours = joursCivilsEntre(maintenant, date);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours > 0) return `dans ${jours} jours`;
  return jours === -1 ? "hier" : `en retard de ${-jours} jours`;
}

/** Le même délai, tourné pour s'enchâsser dans une phrase : « attendue
 *  depuis 68 jours », « attendue dans 8 jours ». */
function quand(date: Date | null, maintenant: Date): string {
  if (!date) return "sans date convenue";
  const jours = joursCivilsEntre(maintenant, date);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours > 0) return `dans ${jours} jours`;
  return jours === -1 ? "depuis hier" : `depuis ${-jours} jours`;
}

export default async function EquipementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; equipementId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, equipementId } = await params;
  const { de } = await searchParams;

  const eq = await getFicheEquipement(equipementId);
  if (!eq || eq.etablissementId !== id) notFound();

  // Un seul bâtiment : le nommer n'apprend rien, et l'ADR-019 veut que le
  // mono-bâtiment ne paie pas la complexité du multi.
  const multiBatiments = eq.etablissement._count.batiments > 1;

  const base = `/etablissements/${id}`;
  const provenance = lireProvenance(de, id);
  const parc = { href: `${base}/equipements`, label: "Équipements" };
  // Les liens que cette fiche pose s'annoncent eux-mêmes : la chaîne de
  // provenance reste bornée à un saut (ADR-014).
  const depuisCetteFiche = `${base}/equipements/${equipementId}`;

  // Page serveur : l'horloge est lue une fois par requête. Deux `new Date()`
  // séparés par un `await` peuvent tomber de part et d'autre de minuit.
  const maintenant = new Date();

  const aFaire = lignesAFaire(eq, base, maintenant);
  const histoire = lignesHistoire(eq, base, maintenant);
  const obligations = obligationsDeLEquipement(eq);

  // Ce qui vise cet appareil sans jamais tomber à une date. Lu au MOTEUR et
  // non aux `Verification` : le générateur saute la périodicité `autre`, donc
  // une obligation événementielle n'a aucune ligne persistée et `obligations`
  // ci-dessus ne peut structurellement pas la voir.
  const declenchees = obligationsDeclencheesParUnFait(eq);

  // POURQUOI LE COMPTE DU BANDEAU CHANGE. La pastille « N obligations » se
  // calculait sur les seules obligations qui ont produit une ligne de suivi.
  // Le corps de la fiche en nomme désormais d'autres, et « un en-tête ne doit
  // jamais contredire ce qu'il coiffe » (charte, § 5). Le dédoublonnage n'a
  // aujourd'hui rien à retirer — une événementielle ne peut pas avoir de
  // `Verification` — mais il coûte une ligne et évite le double compte le jour
  // où une prescription particulière en engendrera une.
  const idsAvecSuivi = new Set(obligations.map((o) => o.id));
  const obligationsCitees = [
    ...obligations,
    ...declenchees
      .filter((d) => !idsAvecSuivi.has(d.obligation.id))
      .map((d) => d.obligation),
  ];

  const caracteristiques = caracteristiquesLisibles(
    eq.categorie,
    eq.caracteristiques,
  );

  // Le rendez-vous de tête : la première ligne datée de « à faire ». Une
  // occurrence à planifier n'en est pas un — sa date est une date de
  // génération (ADR-010).
  const tete = aFaire.find((l) => l.date !== null) ?? null;
  const etatTete: RegistreLigne =
    tete?.etat ?? (aFaire.length > 0 ? "aPlanifier" : "faite");
  // Les deux pastilles portent sur des ensembles **disjoints**. Elles
  // filtraient la même liste sur deux axes — le genre pour l'une, l'état
  // pour l'autre — si bien qu'un écart en retard s'affichait « 1 échéance en
  // retard » ET « 1 écart à lever », côte à côte : deux objets, à lire, pour
  // un seul. Le mot suit : « échéance » désigne une vérification partout
  // ailleurs dans le produit.
  const ecartsOuverts = aFaire.filter((l) => l.genre === "action");
  const ecarts = ecartsOuverts.length;
  const ecartsEnRetard = ecartsOuverts.some((l) => l.etat === "enRetard");
  const verifsEnRetard = aFaire.filter(
    (l) => l.genre === "verification" && l.etat === "enRetard",
  ).length;

  // ------------------------------------------------------------------
  // La frise. Quatre repères principaux au plus : au-delà, les étiquettes
  // se chevauchent et la ligne cesse de se lire d'un coup d'œil.
  // ------------------------------------------------------------------
  const jalons: JalonFrise[] = [];
  if (eq.dateMiseEnService) {
    jalons.push({
      cle: "mise-en-service",
      date: eq.dateMiseEnService,
      libelle: "Mise en service",
      etat: "aPlanifier",
    });
  }
  for (const h of histoire
    .filter((l) => l.cle !== "mise-en-service")
    .slice(0, 2)) {
    jalons.push({
      cle: h.cle,
      date: h.date,
      libelle: h.resultat ? LABEL_RESULTAT[h.resultat] : "Vérifiée",
      // Le champ suit le constat, pas le fait qu'une visite ait eu lieu :
      // un « Écart majeur » vert se lisait comme un feu vert.
      etat: etatDuResultat(h.resultat),
    });
  }
  if (tete) {
    jalons.push({
      cle: tete.cle,
      date: tete.date!,
      // Sur la rangée basse, l'étiquette porte sa propre date : elle est
      // seule de sa ligne et n'a pas le sur-titre mois des autres.
      libelle: `${formaterJourMoisFr(tete.date!)} · ${
        tete.genre === "action" ? "écart à lever" : "vérification"
      }`,
      etat: tete.etat,
      vedette: true,
    });
  }
  // Les autres échéances datées passent en second plan : elles situent le
  // rythme sans revendiquer d'étiquette pleine.
  for (const l of aFaire
    .filter((l) => l !== tete && l.date !== null)
    .slice(0, 2)) {
    jalons.push({
      cle: l.cle,
      date: l.date!,
      libelle: `${formaterJourMoisFr(l.date!)} · ${l.genre === "action" ? "action" : "vérification"}`,
      etat: l.etat,
      second: true,
    });
  }
  const frise = construireFrise({ jalons, maintenant });

  // Le chapeau dit deux faits, jamais un verdict : ce qui est attendu, et
  // ce qui est déjà au dossier. Pas un mot de conformité.
  const trace =
    histoire.length > 0
      ? `Dernière trace au dossier : ${formaterDateLongueFr(histoire[0].date)}.`
      : "Aucune preuve n'est encore au dossier pour cet appareil.";
  const chapeau = tete
    ? `${
        tete.genre === "action"
          ? `Un écart reste à lever ${quand(tete.date, maintenant)}`
          : `Une vérification est attendue ${quand(tete.date, maintenant)}`
      }. ${trace}`
    : aFaire.length > 0
      ? `Des vérifications sont rattachées à cet appareil, mais aucune date n'a encore été convenue. ${trace}`
      : `Aucune échéance n'est ouverte sur cet appareil à ce jour. ${trace}`;

  const realisateurs = realisateursRequis(obligationsCitees);

  // Les propriétés qui bornent réellement une obligation de CET appareil.
  // Une question à trois états est posée dès que la catégorie correspond,
  // mais sa condition se combine à la typologie : « VMC raccordée au gaz »
  // ne fonde une obligation qu'en habitation. Annoncer « l'obligation
  // reste au calendrier » sur la VMC d'un restaurant serait une
  // affirmation de droit que le calendrier contredit — l'outil rend des
  // faits, il n'invente pas une obligation (cf. garde-fous produit).
  //
  // `declenchees` n'y entre PAS, et la phrase ci-dessus dit pourquoi : la
  // mention promet que « l'obligation reste au calendrier », ce qui est vrai
  // d'une échéance à rythme et faux d'une événementielle — le générateur ne
  // lui ouvre aucune ligne. L'y ajouter aurait affiché la promesse inverse de
  // ce que la carte « Ce qui se déclenche sur cet appareil » explique deux
  // blocs plus bas.
  const proprietesPortees = new Set(
    obligations.flatMap((o) => o.conditions?.map((c) => c.propriete) ?? []),
  );

  return (
    <EcranFiche
      provenance={provenance}
      canonique={parc}
      bandeau={
        <HeroEquipement
          categorie={eq.categorie}
          date={tete?.date ?? null}
          etat={etatTete}
          surtitre={
            <>
              Équipement · {LABEL_CATEGORIE_EQUIPEMENT[eq.categorie]}
              {/* Le bâtiment d'abord, la précision ensuite : le parc renvoie
                  ici en annonçant qu'un appareil se déplace depuis sa fiche,
                  et la fiche ne nommait pas le lieu. Sous un seul bâtiment,
                  le nommer n'apprend rien (ADR-019). */}
              {multiBatiments ? ` · ${eq.batiment.nom}` : null}
              {eq.localisation ? ` · ${eq.localisation}` : null}
            </>
          }
          titre={eq.libelle}
          chapeau={chapeau}
          frise={frise}
          pastilles={
            <>
              {!eq.actif && (
                <PastilleFiche ton="retard">Retiré du parc</PastilleFiche>
              )}
              {verifsEnRetard > 0 && (
                <PastilleFiche ton="retard">
                  {verifsEnRetard} vérification{verifsEnRetard > 1 ? "s" : ""} en
                  retard
                </PastilleFiche>
              )}
              {ecarts > 0 && (
                <PastilleFiche ton={ecartsEnRetard ? "retard" : "proche"}>
                  {ecarts} écart{ecarts > 1 ? "s" : ""} à lever
                </PastilleFiche>
              )}
              {eq.dateMiseEnService && (
                <PastilleFiche ton="neutre">
                  En service depuis {formaterMoisAnneeFr(eq.dateMiseEnService)}
                </PastilleFiche>
              )}
              {/* LA PÉREMPTION SE MONTRE, ELLE NE S'ALERTE PAS. Aucun texte lu
                  n'attache d'échéance à cette date : le 3° de l'article 2 de
                  l'arrêté du 19 mars 1993 demande au VÉRIFICATEUR de constater
                  l'élimination des équipements périmés, pas au produit de la
                  réclamer. Un ton « retard » ferait donc croire à une échéance
                  dépassée là où il n'y en a aucune — c'est un fait daté, pas
                  une non-conformité, et le mot le dit : « périmé depuis »
                  quand la date est passée, sinon la date seule. */}
              {eq.datePeremption && (
                <PastilleFiche
                  ton={eq.datePeremption < maintenant ? "retard" : "neutre"}
                >
                  {eq.datePeremption < maintenant
                    ? `Périmé depuis ${formaterMoisAnneeFr(eq.datePeremption)}`
                    : `Péremption ${formaterMoisAnneeFr(eq.datePeremption)}`}
                </PastilleFiche>
              )}
              <PastilleFiche ton="neutre">
                {`${obligationsCitees.length} obligation${obligationsCitees.length > 1 ? "s" : ""}`}
              </PastilleFiche>
            </>
          }
          actions={
            <>
              {/* Les articles qui fondent les vérifications se lisent une
                  fois, pas à chaque ouverture de la fiche : ils passent
                  derrière le « ? », le même objet que celui du calendrier. */}
              <AideEcran titre="Pourquoi on vérifie cet équipement">
                {obligationsCitees.length === 0 ? (
                  <p className="m-0">
                    Aucune obligation du référentiel n&apos;est rattachée à cet
                    appareil pour l&apos;instant. Sa catégorie n&apos;en
                    déclenche peut-être aucune sous vos régimes, ou son
                    calendrier n&apos;a pas encore été généré.
                  </p>
                ) : (
                  <>
                    <p className="m-0">
                      {obligationsCitees.length > 1
                        ? `${obligationsCitees.length} obligations du référentiel s'appliquent à cet appareil.`
                        : "Une obligation du référentiel s'applique à cet appareil."}{" "}
                      Chacune cite l&apos;article qui la fonde&nbsp;: c&apos;est
                      celui qu&apos;on présente en cas de contrôle.
                    </p>
                    {obligationsCitees.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3.5"
                      >
                        <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                          {o.libelle}
                        </p>
                        {/* La référence qui **fonde** l'obligation vient en
                            premier dans le référentiel (ADR-003) : c'est
                            celle qu'on citerait seule devant un inspecteur. */}
                        <p className="m-0 mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                          {o.referencesLegales[0].reference}
                        </p>
                        <span className="pastille-board mt-3 bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]">
                          {LABEL_PERIODICITE[o.periodicite]}
                        </span>
                      </div>
                    ))}
                    <Link
                      href={`${base}/guide`}
                      className="text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                    >
                      Lire l&apos;explication dans Comprendre →
                    </Link>
                  </>
                )}
              </AideEcran>
              <Link
                href={`${base}/equipements/${equipementId}/modifier`}
                className={cn(
                  buttonVariants({ variant: "boardClair", size: "board" }),
                )}
              >
                Modifier
              </Link>
            </>
          }
        />
      }
    >
      <CorpsFiche
        principal={
          <>
            <CarteFiche
              titreFort="L'appareil"
              droite={
                <Link
                  href={`${base}/equipements/${equipementId}/modifier`}
                  className="text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                >
                  Modifier →
                </Link>
              }
              corpsClassName="px-7 pb-7 pt-5 sm:px-8"
            >
              <ChampsFiche>
                <ChampFiche cle="Catégorie">
                  {LABEL_CATEGORIE_EQUIPEMENT[eq.categorie]}
                </ChampFiche>
                {multiBatiments ? (
                  <ChampFiche cle="Zone">{eq.batiment.nom}</ChampFiche>
                ) : null}
                <ChampFiche cle="Localisation">
                  {eq.localisation ?? (
                    <span className="text-[color:var(--board-slate-soft)]">
                      Non précisée
                    </span>
                  )}
                </ChampFiche>
                <ChampFiche cle="Mise en service">
                  {eq.dateMiseEnService ? (
                    formaterDateLongueFr(eq.dateMiseEnService)
                  ) : (
                    <span className="text-[color:var(--board-slate-soft)]">
                      Non renseignée
                    </span>
                  )}
                </ChampFiche>
                <ChampFiche cle="Réalisateur requis">
                  {realisateurs ?? (
                    <span className="text-[color:var(--board-slate-soft)]">
                      Aucune obligation rattachée
                    </span>
                  )}
                </ChampFiche>
                {/* Les caractéristiques déclarées ne sont pas décoratives :
                  six d'entre elles bornent des obligations. Une question
                  sans réponse se lit ici, avec ce qu'elle implique. */}
                {caracteristiques.map((c) => (
                  <ChampFiche key={c.cle} cle={c.libelle}>
                    {c.enAttente ? (
                      <span className="text-[color:var(--board-slate-soft)]">
                        {c.valeur}
                        {proprietesPortees.has(c.cle)
                          ? " — l'obligation reste au calendrier"
                          : ""}
                      </span>
                    ) : (
                      c.valeur
                    )}
                  </ChampFiche>
                ))}
              </ChampsFiche>
            </CarteFiche>

            {/* CE QUI EST DÛ SANS JAMAIS TOMBER À UNE DATE.

              La carte ne se pose QUE si le moteur en rend une, et c'est le
              seul endroit de cette fiche où l'emplacement vide ne se pose pas.
              Le corollaire de la charte — « un emplacement vide se pose quand
              même » — vise ce que l'utilisateur peut remplir : une photo, un
              document, une plaque signalétique. Ici il n'y a rien à remplir ;
              une carte permanente disant « aucune » sur les neuf appareils sur
              dix qui n'en portent aucune serait du bruit, et le panneau « ? »
              du bandeau énumère de toute façon TOUTES les obligations de
              l'appareil.

              Elle est dans la colonne PRINCIPALE et non dans « À faire », qui
              est à droite. `CorpsFiche` a un contrat : les faits à gauche, le
              geste attendu à droite. Une obligation événementielle n'appelle
              aucun geste aujourd'hui — la ranger sous « À faire » lui aurait
              donné l'apparence d'une tâche datée, exactement ce que l'ADR-010
              interdit de fabriquer. Elle suit « L'appareil » parce que ce sont
              les caractéristiques déclarées juste au-dessus qui la bornent. */}
            {declenchees.length > 0 && (
              <CarteFiche titreFort="Ce qui se déclenche sur cet appareil">
                <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  {declenchees.length > 1
                    ? "Aucun texte n'écrit de rythme pour ces obligations : elles sont dues à un "
                    : "Aucun texte n'écrit de rythme pour cette obligation : elle est due à un "}
                  <strong className="font-semibold">fait</strong>{" "}
                  — chaque ligne dit lequel —, et Rojer ne voit pas ce fait
                  passer. Il
                  n&apos;y a donc ici ni échéance ni retard&nbsp;:{" "}
                  {declenchees.length > 1 ? "les lignes attendent" : "la ligne attend"}{" "}
                  le jour où vous toucherez à l&apos;appareil.
                </p>
                <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
                  {declenchees.map(({ obligation, raisons }) => (
                    <li
                      key={obligation.id}
                      className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5"
                    >
                      <p className="m-0 text-[13.5px] font-semibold leading-tight text-[color:var(--board-slate-ink)]">
                        {obligation.libelle}
                      </p>
                      {/* La phrase du RÉFÉRENTIEL, pas une reformulation :
                          c'est elle qui nomme le fait déclencheur — « toute
                          modification affectant le circuit frigorifique ». */}
                      <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                        {obligation.description}
                      </p>
                      {/* Le mode *explain* du moteur, tel qu'il l'écrit. Il
                          répond à l'autre question — pourquoi CET appareil-ci
                          et pas le voisin — et une phrase réécrite à la main
                          finirait par dire autre chose que le calcul. */}
                      {raisons.length > 0 && (
                        <p className="m-0 mt-2 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                          Pourquoi elle vise cet appareil : {raisons.join(" · ")}.
                        </p>
                      )}
                      {/* La référence qui FONDE l'obligation vient en premier
                          dans le référentiel (ADR-003). Même geste que sur la
                          fiche d'un salarié : pastille dépliable quand elle
                          pointe un texte, texte simple sinon — l'apparence
                          d'un lien sans rien dessous est un lien mort. */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        {obligation.referencesLegales.slice(0, 1).map((r) =>
                          r.url ? (
                            <LegalBadge
                              key={r.article ?? r.reference}
                              charte="board"
                              reference={r.reference}
                              href={r.url}
                            />
                          ) : (
                            <span
                              key={r.article ?? r.reference}
                              className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]"
                            >
                              § {r.reference}
                            </span>
                          ),
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CarteFiche>
            )}

            {/* Posées même vides : un emplacement qui n'apparaît qu'une fois
              rempli ne se remplit jamais. */}
            <CartePhotos />
            <CarteDocuments />
          </>
        }
        cote={
          <>
            <CarteFiche
              titre="À faire"
              droite={
                aFaire.length > 0 ? (
                  <PastilleFiche ton="neutre">{aFaire.length}</PastilleFiche>
                ) : undefined
              }
              corpsClassName="pb-6 pt-3"
            >
              {aFaire.length === 0 ? (
                <p className="m-0 px-7 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:px-8">
                  Rien n&apos;est ouvert sur cet appareil. Cela ne veut pas dire
                  qu&apos;il est conforme&nbsp;: cela veut dire qu&apos;aucune
                  échéance ni aucun écart n&apos;est enregistré à ce jour.
                </p>
              ) : (
                <>
                  <LignesFiche>
                    {aFaire.slice(0, 4).map((l) => (
                      <LigneFiche
                        key={l.cle}
                        href={avecProvenance(l.href, depuisCetteFiche)}
                        compact
                        tuile={
                          l.date ? (
                            <TuileDate date={l.date} etat={l.etat} />
                          ) : (
                            <TuileMuette>à dater</TuileMuette>
                          )
                        }
                        titre={l.libelle}
                        detail={
                          <span
                            style={{
                              color:
                                l.etat === "enRetard"
                                  ? "var(--board-signal-ink)"
                                  : undefined,
                            }}
                          >
                            {delai(l.date, maintenant)}
                          </span>
                        }
                      />
                    ))}
                  </LignesFiche>
                  <div className="px-7 pt-4 sm:px-8">
                    <Link
                      href={`${base}/calendrier?vue=equipement#eq-${eq.id}`}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                    >
                      Voir cet équipement au calendrier
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </>
              )}
            </CarteFiche>

            <CarteFiche titre="Ce qui a été fait" corpsClassName="pb-6 pt-3">
              {histoire.length === 0 ? (
                <p className="m-0 px-7 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:px-8">
                  Aucune trace au dossier — ni rapport, ni date de mise en
                  service.
                </p>
              ) : (
                <>
                  <LignesFiche>
                    {histoire.slice(0, 3).map((h) => (
                      <LigneFiche
                        key={h.cle}
                        href={
                          h.href
                            ? avecProvenance(h.href, depuisCetteFiche)
                            : undefined
                        }
                        compact
                        tuile={<TuileDate date={h.date} etat={h.etat} />}
                        titre={h.libelle}
                        detail={h.detail}
                      />
                    ))}
                  </LignesFiche>
                  <div className="px-7 pt-4 sm:px-8">
                    <Link
                      href={`${base}/registre`}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                    >
                      Tout voir dans le registre
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </>
              )}
            </CarteFiche>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-dashed border-[color:var(--board-slate)] px-6 py-5">
              <div className="min-w-[200px] flex-1">
                <p className="m-0 text-[13.5px] font-semibold text-[color:var(--board-ink)]">
                  Cet équipement n&apos;est plus là&nbsp;?
                </p>
                <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  Le retirer supprime ses vérifications à venir. Ses rapports et
                  ses actions restent au dossier.
                </p>
              </div>
              <SupprimerEquipementButton
                id={eq.id}
                redirectTo={(provenance ?? parc).href}
              />
            </div>
          </>
        }
      />
    </EcranFiche>
  );
}

/**
 * Qui a le droit de faire ces contrôles, d'après le référentiel. Plusieurs
 * obligations peuvent l'exiger différemment : on les cite toutes plutôt que
 * de trancher à leur place.
 */
function realisateursRequis(
  obligations: ReturnType<typeof obligationsDeLEquipement>,
): string | null {
  const vus = new Set<string>();
  for (const o of obligations) {
    for (const r of o.realisateurs) vus.add(LABEL_REALISATEUR[r]);
  }
  if (vus.size === 0) return null;
  return [...vus].join(", ");
}
