import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import ItemWizard from "../components/item-wizard/ItemWizard";

export const metadata: Metadata = {
  title: "Opret opslag · Hittegodscentralen",
};

export default async function CreateItemPage() {
  const user = await getCurrentUser();
  return <ItemWizard mode="create" userEmail={user?.email ?? null} />;
}
