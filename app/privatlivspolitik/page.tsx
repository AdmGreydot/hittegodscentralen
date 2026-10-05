import type { Metadata } from "next";
import Link from "next/link";
import { ITEM_LIFETIME_MONTHS } from "../../lib/item-expiry";
import LegalPage, { type LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privatlivspolitik · Hittegodscentralen",
  description:
    "Hvilke personoplysninger Hittegodscentralen behandler, hvorfor, og hvilke rettigheder du har.",
};

const UPDATED = "5. oktober 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "ansvarlig",
    title: "Hvem er ansvarlig",
    body: (
      <>
        <p>
          Greydot er dataansvarlig for de personoplysninger, der behandles på
          Hittegodscentralen.
        </p>
        <p>
          Greydot
          <br />
          J Skjoldborgs Vej 57, 8230 Åbyhøj
          <br />
          <a href="mailto:info@hittegodscentralen.dk">
            info@hittegodscentralen.dk
          </a>
        </p>
      </>
    ),
  },
  {
    id: "oplysninger",
    title: "Hvilke oplysninger vi behandler",
    body: (
      <>
        <h3>Når du opretter en konto</h3>
        <p>
          Dit navn, din e-mail og din adgangskode. Adgangskoden gemmes kun
          krypteret, så ingen, heller ikke vi, kan læse den.
        </p>
        <h3>Når du opretter et opslag</h3>
        <p>
          Titel, beskrivelse, kategori, billede, dato og sted (region, by,
          postnummer og evt. adresse eller et punkt på kortet). Opretter du
          opslaget uden profil, gemmer vi også din e-mail, så vi kan sende
          beskeder videre til dig.
        </p>
        <p>
          Billeder bliver gjort mindre i din browser, inden de sendes til os.
          Det fjerner også skjulte oplysninger fra kameraet, fx hvor billedet er
          taget.
        </p>
        <h3>Når du skriver med andre</h3>
        <p>
          Beskeder i chatten, hvornår de er sendt, og om de er læst. Skriver du
          til et opslag oprettet uden profil eller via vores kontaktformular,
          behandler vi dit navn, din e-mail, dit telefonnummer (hvis du oplyser
          det) og din besked.
        </p>
        <h3>Når du bruger &quot;Brug min lokation&quot; eller kortet</h3>
        <p>
          Din browser spørger dig, før den deler din placering. Placeringen
          bruges kun til at udfylde stedet i opslaget og gemmes kun, hvis du
          opretter opslaget.
        </p>
        <h3>Tekniske oplysninger</h3>
        <p>
          Når du besøger siden, registrerer vores hosting din IP-adresse i
          almindelige serverlogs. For at beskytte formularerne mod spam gemmer
          vi en krypteret (hashet) udgave af din IP-adresse, når du sender en
          besked eller beder om en ny adgangskode.
        </p>
      </>
    ),
  },
  {
    id: "formaal",
    title: "Hvorfor og med hvilken ret",
    body: (
      <table>
        <thead>
          <tr>
            <th>Formål</th>
            <th>Retsgrundlag</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              At give dig en konto, vise dine opslag og formidle kontakt mellem
              brugerne
            </td>
            <td>
              Aftale med dig, når du bruger tjenesten (GDPR art. 6, stk. 1,
              litra b)
            </td>
          </tr>
          <tr>
            <td>
              At sende de e-mails, der hører til tjenesten, fx nye beskeder og
              udløb af opslag
            </td>
            <td>Aftale med dig (art. 6, stk. 1, litra b)</td>
          </tr>
          <tr>
            <td>At besvare henvendelser via kontaktformularen</td>
            <td>
              Vores legitime interesse i at hjælpe dig (art. 6, stk. 1, litra f)
            </td>
          </tr>
          <tr>
            <td>At beskytte siden mod spam, svindel og misbrug</td>
            <td>
              Vores legitime interesse i en sikker tjeneste (art. 6, stk. 1,
              litra f)
            </td>
          </tr>
          <tr>
            <td>At overholde lovkrav, fx hvis politiet beder om oplysninger</td>
            <td>Retlig forpligtelse (art. 6, stk. 1, litra c)</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    id: "synligt",
    title: "Hvad andre kan se",
    body: (
      <ul>
        <li>
          <strong>Alle</strong> kan se aktive opslag: titel, beskrivelse,
          billede, sted og dato. Er opslaget oprettet med en profil, vises dit
          navn også.
        </li>
        <li>
          <strong>Den, du skriver med,</strong> kan se dit navn og jeres
          beskeder, men ikke din e-mail.
        </li>
        <li>
          <strong>Ved opslag uden profil</strong> får opretteren afsenderens
          navn, e-mail og evt. telefonnummer sammen med beskeden. Opretterens
          e-mail deles ikke, før opretteren selv vælger at svare. Læs mere i{" "}
          <Link href="/vilkaar-og-betingelser#kontakt">vilkårene</Link>.
        </li>
        <li>Din e-mail og dit telefonnummer vises aldrig offentligt.</li>
      </ul>
    ),
  },
  {
    id: "leverandoerer",
    title: "Leverandører",
    body: (
      <>
        <p>
          Vi bruger nogle få leverandører til at drive siden. De behandler kun
          oplysninger på vores vegne og efter vores instruks. Vi sælger aldrig
          dine oplysninger.
        </p>
        <table>
          <thead>
            <tr>
              <th>Leverandør</th>
              <th>Hvad de gør</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Database, login og opbevaring af billeder</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Hosting af hjemmesiden</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Afsendelse af e-mails</td>
            </tr>
            <tr>
              <td>OpenFreeMap</td>
              <td>
                Kortet. Din browser henter kortet direkte derfra, så de modtager
                din IP-adresse.
              </td>
            </tr>
            <tr>
              <td>OpenStreetMap Foundation (Nominatim)</td>
              <td>
                Finder adressen ud fra et punkt eller et postnummer. Modtager
                punktet, og når det sker fra din browser, også din IP-adresse.
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          Nogle af leverandørerne er placeret uden for EU, fx i USA. Overførslen
          sker i så fald på grundlag af EU-Kommissionens
          standardkontraktbestemmelser eller EU-U.S. Data Privacy Framework.
        </p>
      </>
    ),
  },
  {
    id: "opbevaring",
    title: "Hvor længe vi gemmer oplysningerne",
    body: (
      <ul>
        <li>
          <strong>Konto:</strong> indtil du beder os om at slette den.
        </li>
        <li>
          <strong>Opslag:</strong> er synlige i {ITEM_LIFETIME_MONTHS} måneder,
          eller til du forlænger, løser eller sletter dem. Derefter gemmes de
          skjult, så du kan se dem under din profil og genåbne dem, indtil du
          sletter dem eller din konto.
        </li>
        <li>
          <strong>Beskeder:</strong> så længe opslaget og jeres konti findes.
        </li>
        <li>
          <strong>Henvendelser via kontaktformularen:</strong> så længe det er
          nødvendigt for at besvare dem.
        </li>
        <li>
          <strong>Krypterede IP-adresser til spambeskyttelse:</strong> 7 dage.
        </li>
      </ul>
    ),
  },
  {
    id: "rettigheder",
    title: "Dine rettigheder",
    body: (
      <>
        <p>Du har ret til at:</p>
        <ul>
          <li>få indsigt i de oplysninger, vi har om dig,</li>
          <li>få rettet forkerte oplysninger,</li>
          <li>få slettet dine oplysninger,</li>
          <li>få begrænset behandlingen,</li>
          <li>
            få udleveret dine oplysninger i et almindeligt format
            (dataportabilitet),
          </li>
          <li>
            gøre indsigelse mod behandling, der sker på grundlag af vores
            legitime interesse.
          </li>
        </ul>
        <p>
          Skriv til{" "}
          <a href="mailto:info@hittegodscentralen.dk">
            info@hittegodscentralen.dk
          </a>
          , så svarer vi inden for en måned. Er du utilfreds med, hvordan vi
          behandler dine oplysninger, kan du klage til{" "}
          <a
            href="https://www.datatilsynet.dk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Datatilsynet
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "sikkerhed",
    title: "Sikkerhed",
    body: (
      <p>
        Al trafik til siden er krypteret (HTTPS). Adgangskoder gemmes kun
        krypteret, og databasen er sat op, så brugere kun kan se det, de har
        adgang til. Kontakt-e-mails på opslag uden profil kan slet ikke læses
        udefra.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        Vi bruger kun den cookie, der skal til for at holde dig logget ind. Læs
        mere i vores <Link href="/cookiepolitik">cookiepolitik</Link>.
      </p>
    ),
  },
  {
    id: "aendringer",
    title: "Ændringer",
    body: (
      <p>
        Vi opdaterer politikken, når vi ændrer, hvordan vi behandler
        oplysninger. Datoen øverst viser, hvornår den sidst er ændret. Ved
        væsentlige ændringer giver vi besked på siden eller på e-mail.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privatlivspolitik"
      intro="Her kan du læse, hvilke oplysninger vi behandler om dig, hvorfor vi gør det, hvem vi deler dem med, og hvilke rettigheder du har."
      updated={UPDATED}
      sections={SECTIONS}
    />
  );
}
