"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  MessageSquare,
  Search,
  SendHorizontal,
} from "lucide-react";
import { initials } from "../../../lib/initials";
import type { ConversationSummary, Message } from "../../../lib/messages";
import { createClient } from "../../../lib/supabase/client";
import ItemStatusControl, {
  type StatusConversation,
} from "../../components/item-status/ItemStatusControl";
import { markConversationRead, sendMessage } from "../actions";

const TYPE_LABEL = { lost: "Tabt", found: "Fundet" };
const TYPE_COLOR = { lost: "text-brand-rust", found: "text-brand-green" };
const AVATAR_COLORS = ["bg-brand-green", "bg-brand-rust", "bg-brand-brown"];

function avatarColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const TZ = "Europe/Copenhagen";
const timeFormat = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const weekdayFormat = new Intl.DateTimeFormat("da-DK", { weekday: "short", timeZone: TZ });
const shortDateFormat = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", timeZone: TZ });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

function daysAgo(iso: string) {
  const day = (d: Date) => Date.parse(dayKey.format(d));
  return Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000);
}

// "10:42", "I går", "man.", "17. sep."
function listTime(iso: string) {
  const days = daysAgo(iso);
  if (days <= 0) return timeFormat.format(new Date(iso));
  if (days === 1) return "I går";
  if (days < 7) return weekdayFormat.format(new Date(iso));
  return shortDateFormat.format(new Date(iso));
}

// "10:42" today, otherwise "17. sep. 10:42"
function messageTime(iso: string) {
  const time = timeFormat.format(new Date(iso));
  return daysAgo(iso) <= 0 ? time : `${shortDateFormat.format(new Date(iso))} ${time}`;
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-semibold text-white ${avatarColor(name)} ${
        size === "lg" ? "size-12" : "size-11 text-sm"
      }`}
    >
      {initials(name)}
    </span>
  );
}

export default function Messages({
  conversations,
  active,
  messages,
  showThreadOnMobile,
}: {
  conversations: ConversationSummary[];
  active: ConversationSummary | null;
  messages: Message[];
  showThreadOnMobile: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // New messages arrive live: refetch the page whenever one is inserted. RLS makes sure only
  // messages in the user's own conversations are sent here.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("profile-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-gold/25 text-brand-brown">
          <MessageSquare size={26} aria-hidden />
        </span>
        <h2 className="mt-5 font-serif text-2xl font-bold text-brand-brown">Ingen beskeder endnu</h2>
        <p className="mt-2 max-w-sm font-light text-zinc-500">
          Når du skriver til nogen om en genstand — eller nogen skriver til dig — kan du se
          samtalen her.
        </p>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? conversations.filter((c) =>
        `${c.otherName} ${c.itemTitle}`.toLowerCase().includes(term),
      )
    : conversations;

  return (
    <div className="grid h-[min(720px,calc(100dvh-8rem))] overflow-hidden rounded-2xl border border-zinc-200/70 bg-white lg:grid-cols-[340px_minmax(0,1fr)]">
      <section
        aria-label="Samtaler"
        className={`min-h-0 flex-col border-zinc-200 lg:flex lg:border-r ${showThreadOnMobile ? "hidden" : "flex"}`}
      >
        <div className="p-4">
          <label className="relative block">
            <span className="sr-only">Søg i samtaler</span>
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg samtaler..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-4 pl-10 text-sm text-brand-black outline-none placeholder:text-zinc-400 focus:border-brand-brown/40 focus:bg-white"
            />
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.map((c) => (
            <li key={c.id}>
              <ConversationLink conversation={c} selected={c.id === active?.id} />
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-zinc-400">Ingen samtaler matcher.</li>
          )}
        </ul>
      </section>

      {active && (
        <Thread
          // A fresh thread (and composer) per conversation.
          key={active.id}
          conversation={active}
          // The owner's other conversations about the same item, to pick who it went to.
          itemConversations={conversations
            .filter((c) => c.iOwnItem && c.itemId === active.itemId)
            .map((c) => ({ id: c.id, otherName: c.otherName }))}
          messages={messages}
          className={showThreadOnMobile ? "flex" : "hidden lg:flex"}
        />
      )}
    </div>
  );
}

function ConversationLink({
  conversation: c,
  selected,
}: {
  conversation: ConversationSummary;
  selected: boolean;
}) {
  const name = c.otherName || "Ukendt bruger";
  return (
    <Link
      href={`/profil?fane=beskeder&samtale=${c.id}`}
      aria-current={selected ? "true" : undefined}
      scroll={false}
      className={`flex gap-3 border-b border-zinc-100 px-5 py-4 transition-colors ${
        selected ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-brand-black ${c.unread ? "font-semibold" : "font-medium"}`}>
            {name}
          </p>
          <time dateTime={c.lastMessageAt} className="shrink-0 text-xs text-zinc-400">
            {listTime(c.lastMessageAt)}
          </time>
        </div>
        <p className={`truncate text-xs font-medium ${TYPE_COLOR[c.itemType]}`}>
          {TYPE_LABEL[c.itemType]} · {c.itemTitle}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${c.unread ? "text-brand-black" : "font-light text-zinc-500"}`}>
            {c.lastFromMe && "Dig: "}
            {c.lastBody}
          </p>
          {c.unread > 0 && (
            <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-brand-rust px-1.5 text-xs font-semibold text-white">
              {c.unread}
              <span className="sr-only"> ulæste</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Thread({
  conversation,
  itemConversations,
  messages,
  className,
}: {
  conversation: ConversationSummary;
  itemConversations: StatusConversation[];
  messages: Message[];
  className: string;
}) {
  const name = conversation.otherName || "Ukendt bruger";
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startSending] = useTransition();
  // Show a sent message right away, while the server saves it.
  const [shown, addOptimistic] = useOptimistic(messages, (current, body: string) => [
    ...current,
    { id: `pending-${current.length}`, body, fromMe: true, createdAt: new Date().toISOString(), pending: true },
  ]);
  const bottomRef = useRef<HTMLLIElement>(null);

  // Opening a conversation (or a new message arriving in it) marks it as read.
  useEffect(() => {
    if (conversation.unread > 0) markConversationRead(conversation.id);
  }, [conversation.id, conversation.unread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setError(null);
    startSending(async () => {
      addOptimistic(body);
      const result = await sendMessage(conversation.id, body);
      if (result.error) {
        setError(result.error);
        setDraft(body);
      }
    });
  }

  return (
    <section aria-label={`Samtale med ${name}`} className={`min-h-0 flex-col ${className}`}>
      <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-4 sm:px-6">
        <Link
          href="/profil?fane=beskeder"
          scroll={false}
          className="-ml-1 grid size-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden"
          aria-label="Tilbage til samtaler"
        >
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brand-black">{name}</p>
          <p className={`truncate text-xs font-medium ${TYPE_COLOR[conversation.itemType]}`}>
            Vedr. {TYPE_LABEL[conversation.itemType].toLowerCase()}: {conversation.itemTitle}
          </p>
        </div>
        <Link
          href={`/genstande/${conversation.itemId}`}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-brand-black transition-colors hover:border-brand-brown/40"
        >
          Se opslag
          <ArrowRight size={14} aria-hidden />
        </Link>
      </header>

      {(conversation.iOwnItem || conversation.itemStatus !== "active") && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-zinc-200 bg-brand-gold/10 px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-brand-brown">
            {conversation.itemStatus === "active" ? (
              conversation.itemType === "lost" ? (
                "Har du fået din genstand igen?"
              ) : (
                "Er genstanden kommet hjem til ejeren?"
              )
            ) : (
              <>
                <CircleCheck size={16} className="shrink-0 text-brand-green" aria-hidden />
                {conversation.itemStatus === "archived"
                  ? "Opslaget er arkiveret."
                  : "Opslaget er markeret som afsluttet."}
              </>
            )}
          </p>
          {conversation.iOwnItem && (
            <ItemStatusControl
              item={{
                id: conversation.itemId,
                title: conversation.itemTitle,
                type: conversation.itemType,
                status: conversation.itemStatus,
              }}
              conversations={itemConversations}
              defaultConversationId={conversation.id}
              variant="chip"
            />
          )}
        </div>
      )}

      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-zinc-50/50 px-4 py-6 sm:px-6">
        {shown.map((m) => (
          <li key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                m.fromMe
                  ? "rounded-br-md bg-brand-brown text-white"
                  : "rounded-bl-md bg-zinc-100 text-brand-black"
              } ${"pending" in m ? "opacity-60" : ""}`}
            >
              <p className="leading-relaxed whitespace-pre-line break-words">{m.body}</p>
              <time
                dateTime={m.createdAt}
                className={`mt-1 block text-xs ${m.fromMe ? "text-white/60" : "text-zinc-400"}`}
              >
                {"pending" in m ? "Sender..." : messageTime(m.createdAt)}
              </time>
            </div>
          </li>
        ))}
        <li ref={bottomRef} aria-hidden />
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-zinc-200 p-4"
      >
        {error && (
          <p role="alert" className="mb-2 text-sm text-brand-rust">
            {error}
          </p>
        )}
        <div className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Skriv en besked... (Enter for at sende)"
            aria-label={`Besked til ${name}`}
            className="max-h-40 min-h-12 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-brand-black outline-none [field-sizing:content] placeholder:text-zinc-400 focus:border-brand-brown/40"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-brown text-white transition-colors hover:bg-brand-brown/90 disabled:bg-zinc-300"
            aria-label="Send besked"
          >
            <SendHorizontal size={20} aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}
