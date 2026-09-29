import type { Metadata } from "next";
import { getCategories } from "../../lib/items";
import ItemWizard from "../components/item-wizard/ItemWizard";

export const metadata: Metadata = {
  title: "Opret annonce · Hittegodscentralen",
};

export default async function CreateItemPage() {
  const categories = await getCategories();
  return <ItemWizard mode="create" categories={categories} />;
}
