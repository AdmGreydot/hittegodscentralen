import { createClient } from "./supabase/server";
import type { ItemStatus, ItemType } from "./item-card";

export type ConversationSummary = {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  itemStatus: ItemStatus;
  iOwnItem: boolean; // the user posted the item (and can mark it as handed over)
  otherName: string;
  lastBody: string | null;
  lastFromMe: boolean;
  lastMessageAt: string;
  unread: number;
};

export type Message = {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: string;
};

type ConversationRow = {
  id: string;
  item_id: string;
  item_title: string;
  item_type: ItemType;
  item_status: ItemStatus;
  i_own_item: boolean;
  other_id: string;
  other_name: string;
  last_body: string | null;
  last_sender_id: string | null;
  last_message_at: string;
  unread: number;
};

// The logged-in user's conversations, newest first.
export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) throw error;
  return (data as ConversationRow[]).map((row) => ({
    id: row.id,
    itemId: row.item_id,
    itemTitle: row.item_title,
    itemType: row.item_type,
    itemStatus: row.item_status,
    iOwnItem: row.i_own_item,
    otherName: row.other_name,
    lastBody: row.last_body,
    lastFromMe: row.last_sender_id === userId,
    lastMessageAt: row.last_message_at,
    unread: row.unread,
  }));
}

// All messages in one conversation, oldest first. RLS only returns them to the two participants.
export async function getMessages(conversationId: string, userId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<{ id: string; body: string; sender_id: string; created_at: string }[]>();
  if (error) throw error;
  return data.map((m) => ({
    id: m.id,
    body: m.body,
    fromMe: m.sender_id === userId,
    createdAt: m.created_at,
  }));
}
