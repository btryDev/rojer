import { NextResponse } from "next/server";
import { requireEtablissement } from "@/lib/auth/scope";
import { exporterDonneesSalarie } from "@/lib/salaries/droits";

/**
 * L'extraction des données d'une personne — art. 15 du RGPD, droit d'accès.
 *
 * Le salarié n'a pas accès à l'outil : il demande à son employeur, qui est le
 * responsable de traitement. Cette route est ce qui permet à l'employeur de
 * répondre en un geste plutôt qu'en recopiant un écran à la main.
 *
 * Le format est du JSON lisible, et non un PDF : la personne a le droit de
 * recevoir ses données dans un format exploitable, et l'employeur a besoin de
 * pouvoir les relire lui-même. Chaque bloc porte sa propre explication en
 * français, pour que le fichier se comprenne sans ce code sous les yeux.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; salarieId: string }> },
) {
  const { id, salarieId } = await params;
  // La portée de tenancy avant tout : sans elle, un identifiant deviné
  // exporterait les données d'une personne d'un autre dossier.
  const { db } = await requireEtablissement(id);

  const donnees = await exporterDonneesSalarie(db, id, salarieId);
  if (!donnees) {
    return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  }

  const nom = `${donnees.identite.prenom}-${donnees.identite.nom}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-${nom || "salarie"}.json"`,
      // Une extraction de données personnelles ne se met pas en cache, ni
      // chez l'utilisateur ni sur un intermédiaire.
      "Cache-Control": "no-store",
    },
  });
}
