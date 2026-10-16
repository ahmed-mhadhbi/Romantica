import { catalog } from "@/lib/catalog";
import Storefront, { type Catalog } from "@/components/storefront";
export const dynamic = "force-dynamic";
export default async function Home() {
  const data = await catalog();
  return <Storefront initial={JSON.parse(JSON.stringify(data)) as Catalog} />;
}
