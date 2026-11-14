// Sans dépendance Node : importable depuis les composants client.
export const META_NAME = "outreach-links-verification";
export const FILE_PATH = "/.well-known/outreach-links-verification.txt";

export function metaTag(token: string): string {
  return `<meta name="${META_NAME}" content="${token}">`;
}
