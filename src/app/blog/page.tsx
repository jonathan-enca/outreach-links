import { indexMetadata, renderIndex } from "@/features/content/pages";

/** Statique, relue toutes les heures : un contenu programmé apparaît seul à sa date. */
export const revalidate = 3600;

export const generateMetadata = () => indexMetadata("blog");

export default function Page() {
  return renderIndex("blog");
}
