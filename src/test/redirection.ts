// L'adresse d'un `redirect()` de Next simulé (une erreur portant `url`), ou `null`.
export async function redirigeVers(p: Promise<unknown>): Promise<string | null | undefined> {
  try {
    await p;
  } catch (e) {
    return (e as { url?: string }).url;
  }
  return null;
}
