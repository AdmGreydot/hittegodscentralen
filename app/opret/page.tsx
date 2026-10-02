import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import { getCategories } from "../../lib/items";
import ItemWizard from "../components/item-wizard/ItemWizard";

export const metadata: Metadata = {
  title: "Opret opslag · Hittegodscentralen",
};

export default async function CreateItemPage() {
  const [categories, user] = await Promise.all([getCategories(), getCurrentUser()]);
  return <ItemWizard mode="create" categories={categories} userEmail={user?.email ?? null} />;
}
