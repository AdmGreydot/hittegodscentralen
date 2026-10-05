import "server-only";
import type { ItemType } from "./item-card";
import { EXPIRY_WARNING_DAYS, ITEM_LIFETIME_MONTHS } from "./item-expiry";
import {
  BRAND,
  escapeHtml,
  htmlParagraph,
  htmlQuote,
  mailButton,
  mailHtml,
  SITE_URL,
  type Mail,
} from "./mail";

// The texts of the mails sent when users do something. Each returns subject + text + HTML.

function greeting(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0];
  return first ? `Hej ${first}` : "Hej";
}

export const inboxUrl = (conversationId?: string) =>
  `${SITE_URL}/profil?fane=beskeder${conversationId ? `&samtale=${conversationId}` : ""}`;

// Posters without an account manage their item through a signed link in their mails.
const MANAGE_NOTE =
  "Gem denne e-mail. Med linket kan du markere opslaget som løst, forlænge det eller slette det:";

function manageHtml(url: string) {
  return `<p style="margin:0 0 16px;padding:12px 16px;background:#fdf6e7;border-radius:10px;font-size:14px;">Gem denne e-mail. Med linket kan du markere opslaget som løst, forlænge det eller slette det. <a href="${escapeHtml(url)}" style="color:${BRAND.rust};font-weight:bold;">Administrer dit opslag</a></p>`;
}

const NO_REPLY_NOTE =
  "Du kan ikke svare direkte på denne e-mail. Svar i din indbakke på Hittegodscentralen.";

export function confirmEmailMail(fullName: string, link: string): Mail {
  const intro = "Tak fordi du har oprettet en konto. Bekræft din e-mail, så er du klar.";
  const outro =
    "Linket virker kun én gang og udløber efter kort tid. Har du ikke oprettet en konto, kan du se bort fra denne e-mail.";
  return {
    subject: "Bekræft din e-mail · Hittegodscentralen",
    text: `${greeting(fullName)},\n\n${intro}\n\nBekræft din e-mail: ${link}\n\n${outro}`,
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(fullName))},</p>
<p>${intro}</p>
${mailButton(link, "Bekræft e-mail")}
<p style="font-size:13px;color:#71717a;">${outro}</p>`,
    ),
  };
}

export function welcomeMail(fullName: string): Mail {
  const points = [
    "Opret opslag om ting, du har mistet eller fundet.",
    "Skriv med findere og tabere i en privat chat, uden at din e-mail deles.",
    "Følg dine opslag og markér dem som løst, når tingen er kommet hjem.",
  ];
  return {
    subject: "Velkommen til Hittegodscentralen",
    text: [
      `${greeting(fullName)},`,
      "Velkommen til Hittegodscentralen! Din konto er klar.",
      "Med din profil kan du:",
      points.map((p) => `• ${p}`).join("\n"),
      `Kom i gang: ${SITE_URL}/opret`,
    ].join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(fullName))},</p>
<p>Velkommen til Hittegodscentralen! Din konto er klar.</p>
<p>Med din profil kan du:</p>
<ul style="padding-left:20px;">${points.map((p) => `<li style="margin-bottom:6px;">${p}</li>`).join("")}</ul>
${mailButton(`${SITE_URL}/opret`, "Opret et opslag")}
<p style="font-size:13px;color:#71717a;">Har du spørgsmål, så skriv til os på <a href="${SITE_URL}/kontakt" style="color:#71717a;">hittegodscentralen.dk/kontakt</a>.</p>`,
    ),
  };
}

export function resetPasswordMail(fullName: string, link: string): Mail {
  const intro = "Vi har fået en anmodning om at nulstille adgangskoden til din konto.";
  const outro =
    "Linket virker kun én gang og udløber efter kort tid. Har du ikke bedt om det, kan du se bort fra denne e-mail. Din adgangskode er uændret.";
  return {
    subject: "Nulstil din adgangskode · Hittegodscentralen",
    text: `${greeting(fullName)},\n\n${intro}\n\nVælg en ny adgangskode: ${link}\n\n${outro}`,
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(fullName))},</p>
<p>${intro}</p>
${mailButton(link, "Vælg ny adgangskode")}
<p style="font-size:13px;color:#71717a;">${outro}</p>`,
    ),
  };
}

export function newMessageMail(input: {
  recipientName: string;
  senderName: string;
  itemTitle: string;
  body: string;
  conversationId: string;
}): Mail {
  const sender = input.senderName || "En bruger";
  const intro = `${sender} har skrevet til dig om "${input.itemTitle}":`;
  const link = inboxUrl(input.conversationId);
  return {
    subject: `Ny besked fra ${sender} om "${input.itemTitle}"`,
    text: `${greeting(input.recipientName)},\n\n${intro}\n\n${input.body}\n\nSvar her: ${link}\n\n${NO_REPLY_NOTE}`,
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.recipientName))},</p>
<p>${escapeHtml(intro)}</p>
${htmlQuote(input.body)}
${mailButton(link, "Svar på beskeden")}
<p style="font-size:13px;color:#71717a;">${NO_REPLY_NOTE}</p>`,
    ),
  };
}

export function itemCreatedMail(input: {
  fullName: string;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  hasAccount: boolean;
  manageUrl?: string; // for posters without an account
}): Mail {
  const link = `${SITE_URL}/genstande/${input.itemId}`;
  const what = input.itemType === "lost" ? "din tabte genstand" : "den genstand, du har fundet";
  const intro = `Dit opslag om ${what}, "${input.itemTitle}", er nu oprettet og kan ses af alle på Hittegodscentralen.`;
  const next = input.hasAccount
    ? "Når nogen skriver til dig, får du besked på e-mail, og du kan svare i din indbakke. Er tingen kommet hjem, kan du markere opslaget som løst under din profil."
    : "Når nogen skriver til dig, sender vi beskeden videre til denne e-mail. Din e-mail deles ikke. Først hvis du svarer, kan afsenderen se den.";
  const lifetime = `Opslaget er aktivt i ${ITEM_LIFETIME_MONTHS} måneder. Vi skriver til dig, inden det udløber, så du kan forlænge det.`;
  return {
    subject: `Dit opslag "${input.itemTitle}" er oprettet`,
    text: [
      `${greeting(input.fullName)},`,
      intro,
      next,
      lifetime,
      `Se opslaget: ${link}`,
      input.manageUrl && `${MANAGE_NOTE} ${input.manageUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.fullName))},</p>
<p>${escapeHtml(intro)}</p>
<p>${next}</p>
${mailButton(link, "Se dit opslag")}
${input.manageUrl ? manageHtml(input.manageUrl) : ""}
<p style="font-size:13px;color:#71717a;">${lifetime}</p>`,
    ),
  };
}

export type UnreadConversation = {
  conversationId: string;
  senderName: string;
  itemTitle: string;
  messages: string[];
};

// Messages shown per conversation in the reminder; the rest are counted.
const REMINDER_MESSAGES_SHOWN = 3;

export function unreadReminderMail(recipientName: string, conversations: UnreadConversation[]): Mail {
  const total = conversations.reduce((n, c) => n + c.messages.length, 0);
  const intro =
    total === 1
      ? "Du har en ulæst besked på Hittegodscentralen:"
      : `Du har ${total} ulæste beskeder på Hittegodscentralen:`;

  const sections = conversations.map((c) => {
    const shown = c.messages.slice(-REMINDER_MESSAGES_SHOWN);
    const hidden = c.messages.length - shown.length;
    return {
      heading: `${c.senderName || "En bruger"} om "${c.itemTitle}"`,
      shown,
      more: hidden > 0 ? `+ ${hidden} tidligere ${hidden === 1 ? "besked" : "beskeder"}` : null,
      link: inboxUrl(c.conversationId),
    };
  });

  return {
    subject: total === 1 ? "Du har en ulæst besked" : `Du har ${total} ulæste beskeder`,
    text: [
      `${greeting(recipientName)},`,
      intro,
      ...sections.map((s) =>
        [s.heading, s.more, ...s.shown.map((m) => `> ${m.replace(/\n/g, "\n> ")}`), `Svar her: ${s.link}`]
          .filter(Boolean)
          .join("\n\n"),
      ),
      NO_REPLY_NOTE,
    ].join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(recipientName))},</p>
<p>${escapeHtml(intro)}</p>
${sections
  .map(
    (s) => `<div style="margin:24px 0;padding-top:16px;border-top:1px solid #e4e4e7;">
<p style="margin:0;font-weight:bold;">${escapeHtml(s.heading)}</p>
${s.more ? `<p style="margin:4px 0 0;font-size:13px;color:#71717a;">${escapeHtml(s.more)}</p>` : ""}
${s.shown.map(htmlQuote).join("")}
<p style="margin:0;"><a href="${escapeHtml(s.link)}" style="color:${BRAND.rust};font-weight:bold;">Svar på beskeden →</a></p>
</div>`,
  )
  .join("")}
${mailButton(inboxUrl(), "Gå til din indbakke")}
<p style="font-size:13px;color:#71717a;">${NO_REPLY_NOTE}</p>`,
    ),
  };
}

export type Sender = { name: string; email: string; phone: string; message: string };

function senderLines(sender: Sender) {
  return [`Navn: ${sender.name}`, `E-mail: ${sender.email}`, sender.phone && `Telefon: ${sender.phone}`]
    .filter(Boolean)
    .join("\n");
}

// The contact form on /kontakt, to our own inbox.
export function contactFormMail(sender: Sender): Mail {
  return {
    subject: `Kontaktformular: ${sender.name}`,
    text: `${senderLines(sender)}\n\n${sender.message}`,
    html: mailHtml(
      `<h2 style="margin-top:0;">Ny besked fra kontaktformularen</h2>
${htmlParagraph(senderLines(sender))}
${htmlQuote(sender.message)}`,
    ),
  };
}

// A message passed on to someone who posted an item without an account. Sent with Reply-To set
// to the sender, so answering goes straight to them.
export function itemRelayMail(input: {
  sender: Sender;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  manageUrl?: string;
}): Mail {
  const { sender } = input;
  const itemUrl = `${SITE_URL}/genstande/${input.itemId}`;
  const intro =
    input.itemType === "lost"
      ? `${sender.name} har skrevet til dig om din tabte genstand "${input.itemTitle}".`
      : `${sender.name} har skrevet til dig om genstanden "${input.itemTitle}", som du har fundet.`;
  const replyNote =
    `Svar på denne e-mail for at skrive direkte til ${sender.name}. ` +
    `Når du svarer, kan ${sender.name} se din e-mail-adresse. Vi har ikke delt den med nogen.`;
  return {
    subject: `Ny besked om "${input.itemTitle}" · Hittegodscentralen`,
    text: [
      "Hej,",
      intro,
      sender.message,
      senderLines(sender),
      replyNote,
      `Se opslaget: ${itemUrl}`,
      input.manageUrl && `Er genstanden kommet hjem? Administrer dit opslag: ${input.manageUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">Hej,</p>
<p>${escapeHtml(intro)}</p>
${htmlQuote(sender.message)}
${htmlParagraph(senderLines(sender))}
<p>${escapeHtml(replyNote)}</p>
${mailButton(itemUrl, "Se opslaget")}
${input.manageUrl ? `<p style="font-size:13px;color:#71717a;">Er genstanden kommet hjem? <a href="${escapeHtml(input.manageUrl)}" style="color:#71717a;">Administrer dit opslag</a>.</p>` : ""}`,
    ),
  };
}

const longDate = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

export function itemExpiringMail(input: {
  fullName: string;
  itemId: string;
  itemTitle: string;
  expiresAt: string;
  extendUrl: string;
  hasAccount: boolean;
  manageUrl?: string;
}): Mail {
  const date = longDate.format(new Date(input.expiresAt));
  const intro = `Dit opslag "${input.itemTitle}" udløber den ${date}. Derefter fjernes det fra Hittegodscentralen, og ingen kan længere finde det.`;
  const ask = `Leder du stadig, eller har du stadig genstanden? Så forlæng opslaget med ${ITEM_LIFETIME_MONTHS} måneder.`;
  const done = input.hasAccount
    ? "Er genstanden kommet hjem, kan du markere opslaget som løst under din profil. Ellers behøver du ikke gøre noget."
    : "Er genstanden kommet hjem, kan du markere opslaget som løst. Ellers behøver du ikke gøre noget.";
  const doneLink = input.manageUrl ?? `${SITE_URL}/genstande/${input.itemId}`;
  const doneLabel = input.manageUrl ? "Administrer dit opslag" : "Se opslaget";
  return {
    subject: `Dit opslag "${input.itemTitle}" udløber om ${EXPIRY_WARNING_DAYS} dage`,
    text: [
      `${greeting(input.fullName)},`,
      intro,
      ask,
      `Forlæng opslaget: ${input.extendUrl}`,
      done,
      `${doneLabel}: ${doneLink}`,
    ].join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.fullName))},</p>
<p>${escapeHtml(intro)}</p>
<p>${escapeHtml(ask)}</p>
${mailButton(input.extendUrl, `Forlæng i ${ITEM_LIFETIME_MONTHS} måneder`)}
<p style="font-size:13px;color:#71717a;">${escapeHtml(done)} <a href="${escapeHtml(doneLink)}" style="color:#71717a;">${doneLabel}</a>.</p>`,
    ),
  };
}

export function itemDeletedMail(input: { fullName: string; itemTitle: string; hasAccount: boolean }): Mail {
  const intro = `Dit opslag "${input.itemTitle}" er slettet. Det er fjernet fra Hittegodscentralen sammen med billeder og beskeder om det.`;
  const notYou = input.hasAccount
    ? "Har du ikke selv slettet opslaget, så skriv til os med det samme og skift din adgangskode."
    : "Har du ikke selv slettet opslaget, så skriv til os med det samme.";
  return {
    subject: `Dit opslag "${input.itemTitle}" er slettet`,
    text: [
      `${greeting(input.fullName)},`,
      intro,
      `Mangler du stadig noget, eller har du fundet noget nyt, kan du oprette et nyt opslag: ${SITE_URL}/opret`,
      `${notYou} ${SITE_URL}/kontakt`,
    ].join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.fullName))},</p>
<p>${escapeHtml(intro)}</p>
<p>Mangler du stadig noget, eller har du fundet noget nyt, kan du altid oprette et nyt opslag.</p>
${mailButton(`${SITE_URL}/opret`, "Opret et nyt opslag")}
<p style="font-size:13px;color:#71717a;">${escapeHtml(notYou)} <a href="${SITE_URL}/kontakt" style="color:#71717a;">Kontakt os</a>.</p>`,
    ),
  };
}

export function itemExpiredMail(input: {
  fullName: string;
  itemTitle: string;
  extendUrl: string;
}): Mail {
  const intro = `Dit opslag "${input.itemTitle}" er udløbet og vises ikke længere på Hittegodscentralen.`;
  const ask = `Leder du stadig, eller har du stadig genstanden? Så kan du sætte opslaget op igen i ${ITEM_LIFETIME_MONTHS} måneder.`;
  const done = "Er genstanden kommet hjem, behøver du ikke gøre noget.";
  return {
    subject: `Dit opslag "${input.itemTitle}" er udløbet`,
    text: [`${greeting(input.fullName)},`, intro, ask, `Sæt opslaget op igen: ${input.extendUrl}`, done].join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.fullName))},</p>
<p>${escapeHtml(intro)}</p>
<p>${escapeHtml(ask)}</p>
${mailButton(input.extendUrl, "Sæt opslaget op igen")}
<p style="font-size:13px;color:#71717a;">${done}</p>`,
    ),
  };
}

// Copy to whoever wrote, so they know it went through and have what they wrote.
export function senderReceiptMail(input: {
  name: string;
  message: string;
  item?: { title: string; type: ItemType };
}): Mail {
  const who = input.item?.type === "found" ? "finderen" : "taberen";
  const intro = input.item
    ? `Din besked om "${input.item.title}" er sendt videre til ${who}. Vi har ikke givet dig ${who}s e-mail, og ${who} har fået din. Svarer ${who}, kommer svaret direkte til denne e-mail.`
    : "Tak for din henvendelse. Vi har modtaget den og svarer så hurtigt, vi kan.";
  const subject = input.item ? `Din besked om "${input.item.title}" er sendt` : "Vi har modtaget din henvendelse";
  return {
    subject,
    text: [`${greeting(input.name)},`, intro, "Din besked:", input.message].join("\n\n"),
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.name))},</p>
<p>${escapeHtml(intro)}</p>
<p style="margin-bottom:0;font-size:13px;color:#71717a;">Din besked:</p>
${htmlQuote(input.message)}`,
    ),
  };
}

export type ItemClosedReason = "resolved" | "deleted" | "account_deleted";

// To the other person in a conversation, when the item it was about is closed or removed.
export function itemClosedMail(input: {
  recipientName: string;
  itemTitle: string;
  reason: ItemClosedReason;
  conversationId: string;
}): Mail {
  const text = {
    resolved: `Opslaget "${input.itemTitle}", som I har skrevet sammen om, er markeret som løst af den, der oprettede det. Tak, hvis du var med til at få tingen hjem!`,
    deleted: `Opslaget "${input.itemTitle}", som I har skrevet sammen om, er slettet af den, der oprettede det. Jeres samtale er slettet sammen med opslaget.`,
    account_deleted: `Den bruger, du har skrevet med om "${input.itemTitle}", har slettet sin konto. Jeres samtale er derfor slettet.`,
  }[input.reason];
  const subject = {
    resolved: `"${input.itemTitle}" er markeret som løst`,
    deleted: `Opslaget "${input.itemTitle}" er slettet`,
    account_deleted: `Samtalen om "${input.itemTitle}" er slettet`,
  }[input.reason];
  const button =
    input.reason === "resolved"
      ? mailButton(inboxUrl(input.conversationId), "Se samtalen")
      : mailButton(`${SITE_URL}/genstande`, "Se andre opslag");
  return {
    subject,
    text: `${greeting(input.recipientName)},\n\n${text}`,
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(input.recipientName))},</p>
<p>${escapeHtml(text)}</p>
${button}`,
    ),
  };
}

export function passwordChangedMail(fullName: string): Mail {
  const intro = "Adgangskoden til din konto på Hittegodscentralen er netop blevet ændret.";
  const notYou =
    "Var det ikke dig, så nulstil din adgangskode med det samme via \"Glemt adgangskode\", og skriv til os.";
  return {
    subject: "Din adgangskode er ændret",
    text: `${greeting(fullName)},\n\n${intro}\n\nVar det dig, behøver du ikke gøre noget.\n\n${notYou} ${SITE_URL}/kontakt`,
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(fullName))},</p>
<p>${intro} Var det dig, behøver du ikke gøre noget.</p>
<p style="padding:12px 16px;background:#fdecea;border-radius:10px;font-size:14px;">${escapeHtml(notYou)} <a href="${SITE_URL}/kontakt" style="color:${BRAND.rust};font-weight:bold;">Kontakt os</a></p>`,
    ),
  };
}

export function accountDeletedMail(fullName: string): Mail {
  const intro =
    "Din konto på Hittegodscentralen er slettet. Dine opslag, billeder og beskeder er slettet sammen med den.";
  const back = "Du er altid velkommen tilbage. Du kan oprette en ny konto når som helst.";
  return {
    subject: "Din konto er slettet",
    text: `${greeting(fullName)},\n\n${intro}\n\n${back}\n\nHar du ikke selv slettet din konto, så skriv til os: ${SITE_URL}/kontakt`,
    html: mailHtml(
      `<p style="margin-top:0;">${escapeHtml(greeting(fullName))},</p>
<p>${escapeHtml(intro)}</p>
<p>${escapeHtml(back)}</p>
<p style="font-size:13px;color:#71717a;">Har du ikke selv slettet din konto, så <a href="${SITE_URL}/kontakt" style="color:#71717a;">skriv til os</a>.</p>`,
    ),
  };
}
