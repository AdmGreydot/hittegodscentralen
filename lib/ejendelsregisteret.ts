// The Ejendelsregisteret nudges: shown on the site and in mails at the moments it's most relevant.
// Shared by server and client code. Keep free of server-only imports.

const BASE_URL = "https://www.ejendelsregisteret.dk";

export type NudgeContext =
  | "lost-created" // just posted something they lost
  | "found-created" // just posted something they found
  | "returned" // got their own thing back
  | "gave-up" // gave up on finding it
  | "helped" // handed a found thing over (to the owner, police, ...)
  | "item-page" // looking at their own lost item
  | "profile"; // their profile page

export const NUDGE_COPY: Record<NudgeContext, { title: string; text: string }> = {
  "lost-created": {
    title: "Gør dine andre ting nemmere at få igen",
    text: "Med serienummer, billeder og kvittering samlet ét sted kan du hurtigt bevise, at noget er dit, og anmelde det til politi og forsikring.",
  },
  "found-created": {
    title: "Pas også på dine egne ting",
    text: "Du hjælper en anden med at få sine ting igen. Registrér dine egne, så de kan findes, hvis du mister dem.",
  },
  returned: {
    title: "Godt, at den kom hjem!",
    text: "Registrér den nu, så har du serienummer, billeder og kvittering klar, hvis det sker igen.",
  },
  "gave-up": {
    title: "Det er surt at miste noget",
    text: "Skal tabet anmeldes til forsikringen, hjælper kvittering og serienummer. Registrér dine andre ting, så er du klar, hvis det sker igen.",
  },
  helped: {
    title: "Tak fordi du hjalp",
    text: "Gør det lige så nemt for andre at hjælpe dig: registrér dine egne ting, så de kan findes, hvis de forsvinder.",
  },
  "item-page": {
    title: "Havde du haft serienummeret klar?",
    text: "Med Ejendelsregisteret har du serienummer, billeder og kvittering på dine ting samlet ét sted, klar til politi og forsikring.",
  },
  profile: {
    title: "Få styr på dine ting, før de forsvinder",
    text: "Registrér telefon, cykel, computer og andre værdigenstande med serienummer, billeder og kvittering.",
  },
};

export const NUDGE_POINTS = [
  "Serienummer, billeder og kvittering samlet ét sted",
  "Klar til forsikringen med ét klik",
  "Findbar via Hittegodscentralen, hvis den forsvinder",
];

export const NUDGE_PRICE = "19 kr./md. · Opsig når som helst";

// Tagged, so Ejendelsregisteret can see which nudge brought people in.
export function ejendelsregisteretUrl(context: NudgeContext, medium: "web" | "email", path = "/bliv-medlem") {
  const params = new URLSearchParams({
    utm_source: "hittegodscentralen",
    utm_medium: medium,
    utm_campaign: context,
  });
  return `${BASE_URL}${path}?${params}`;
}
