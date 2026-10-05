import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { type LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Cookiepolitik · Hittegodscentralen",
  description: "Hittegodscentralen bruger kun den cookie, der holder dig logget ind.",
};

const UPDATED = "5. oktober 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "kort",
    title: "Kort fortalt",
    body: (
      <p>
        Vi bruger kun én slags cookie: den, der holder dig logget ind. Vi bruger ingen cookies til
        statistik, annoncer eller sporing, og derfor beder vi dig heller ikke om samtykke.
      </p>
    ),
  },
  {
    id: "hvad",
    title: "Hvad er en cookie",
    body: (
      <p>
        En cookie er en lille tekstfil, som hjemmesiden gemmer i din browser. Den gør det muligt for
        siden at genkende din browser, fx så du ikke skal logge ind på hver side.
      </p>
    ),
  },
  {
    id: "vores",
    title: "De cookies, vi bruger",
    body: (
      <>
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>Formål</th>
              <th>Varighed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>sb-…-auth-token</td>
              <td>
                Holder dig logget ind. Sættes kun, når du logger ind, og kan være delt op i flere
                cookies (.0, .1), hvis den er lang.
              </td>
              <td>Til du logger ud, dog højst 400 dage</td>
            </tr>
          </tbody>
        </table>
        <p>
          Cookien er nødvendig for, at login virker. Efter reglerne kræver nødvendige cookies ikke
          samtykke.
        </p>
      </>
    ),
  },
  {
    id: "tredjepart",
    title: "Andre tjenester",
    body: (
      <ul>
        <li>
          <strong>Kortet</strong> hentes fra OpenFreeMap. Det sætter ingen cookies, men din browser
          sender din IP-adresse til dem, når kortet indlæses.
        </li>
        <li>
          <strong>&quot;Åbn i kort&quot;</strong> fører dig videre til Google Maps. Google kan sætte
          cookies, når du er på deres side. Det sker først, hvis du klikker på linket.
        </li>
      </ul>
    ),
  },
  {
    id: "slet",
    title: "Sådan sletter du cookies",
    body: (
      <p>
        Du kan altid slette cookies i din browsers indstillinger, typisk under &quot;Privatliv&quot;
        eller &quot;Historik&quot;. Sletter du login-cookien, bliver du logget ud. Du kan også blokere
        cookies helt, men så kan du ikke logge ind.
      </p>
    ),
  },
  {
    id: "mere",
    title: "Mere om dine oplysninger",
    body: (
      <p>
        Læs vores <Link href="/privatlivspolitik">privatlivspolitik</Link> for at se, hvilke
        oplysninger vi behandler, og hvilke rettigheder du har. Har du spørgsmål, så skriv til{" "}
        <a href="mailto:info@hittegodscentralen.dk">info@hittegodscentralen.dk</a>.
      </p>
    ),
  },
];

export default function CookiePage() {
  return (
    <LegalPage
      title="Cookiepolitik"
      intro="Her kan du læse, hvilke cookies Hittegodscentralen bruger, og hvorfor."
      updated={UPDATED}
      sections={SECTIONS}
    />
  );
}
