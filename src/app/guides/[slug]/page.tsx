import { articleMetadata, renderArticle, sectionStaticParams } from "@/features/content/pages";

type Props = { params: Promise<{ slug: string }> };

/** Statique, relue toutes les heures : un contenu programmé sort seul à sa date (404 d'ici là). */
export const revalidate = 3600;
/** Seuls les fichiers de `content/guides/` ont une adresse : tout autre slug répond 404 sans rien calculer. */
export const dynamicParams = false;

export const generateStaticParams = () => sectionStaticParams("guides");

export async function generateMetadata({ params }: Props) {
  return articleMetadata("guides", (await params).slug);
}

export default async function Page({ params }: Props) {
  return renderArticle("guides", (await params).slug);
}
