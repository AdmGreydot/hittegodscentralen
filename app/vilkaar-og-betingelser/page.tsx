import type { Metadata } from "next";
import Link from "next/link";
import { ITEM_LIFETIME_MONTHS } from "../../lib/item-expiry";
import LegalPage, { type LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Vilkår & betingelser · Hittegodscentralen",
  description: "Vilkårene for at bruge Hittegodscentralen, oprette en konto og skrive med andre brugere.",
};

const UPDATED = "5. oktober 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "om",
    title: "Om Hittegodscentralen",
    body: (
      <>
        <p>
          Hittegodscentralen er en digital platform, hvor man kan efterlyse ting, man har mistet,
          registrere ting, man har fundet, og komme i kontakt med hinanden. Hittegodscentralen drives
          af Greydot, J Skjoldborgs Vej 57, 8230 Åbyhøj.
        </p>
        <p>
          Har du spørgsmål til vilkårene, kan du skrive til os på{" "}
          <a href="mailto:info@hittegodscentralen.dk">info@hittegodscentralen.dk</a> eller via{" "}
          <Link href="/kontakt">kontaktformularen</Link>.
        </p>
      </>
    ),
  },
  {
    id: "accept",
    title: "Når du bruger siden",
    body: (
      <>
        <p>
          Vilkårene gælder for alle, der bruger Hittegodscentralen. Når du opretter en konto, opretter
          et opslag eller skriver til en anden bruger, bekræfter du, at du har læst og accepterer
          vilkårene. Kan du ikke acceptere dem, skal du lade være med at bruge tjenesten.
        </p>
        <p>Det er gratis at bruge Hittegodscentralen som privatperson.</p>
      </>
    ),
  },
  {
    id: "konto",
    title: "Din konto",
    body: (
      <ul>
        <li>Du skal oplyse dit rigtige navn og en e-mail, som du har adgang til.</li>
        <li>En konto er personlig. Du må ikke oprette konti i andres navn.</li>
        <li>
          Du er selv ansvarlig for at holde din adgangskode hemmelig og for det, der sker fra din
          konto.
        </li>
        <li>
          Du kan til enhver tid bede os om at slette din konto. Så sletter vi også dine opslag og
          beskeder.
        </li>
      </ul>
    ),
  },
  {
    id: "opslag",
    title: "Opslag",
    body: (
      <>
        <ul>
          <li>Oplysningerne i dit opslag skal være rigtige og handle om en ting, der faktisk er tabt eller fundet.</li>
          <li>Du må kun bruge billeder, som du selv har taget eller har lov til at bruge.</li>
          <li>
            Skriv ikke følsomme oplysninger i opslaget, fx CPR-nummer, kontonumre eller koder, og vis
            dem ikke på billeder.
          </li>
          <li>
            Har du fundet noget, så hold gerne et kendetegn tilbage. Så kan du bede den, der skriver,
            om at beskrive det og på den måde vise, at tingen er deres.
          </li>
        </ul>
        <p>
          Et opslag er synligt i {ITEM_LIFETIME_MONTHS} måneder. Inden det udløber, sender vi dig en
          e-mail, så du kan forlænge det. Forlænger du det ikke, fjernes det fra siden. Du kan altid
          selv markere et opslag som løst eller slette det.
        </p>
      </>
    ),
  },
  {
    id: "kontakt",
    title: "Kontakt mellem brugere",
    body: (
      <>
        <p>
          Al kontakt om et opslag går gennem Hittegodscentralen. Vi viser aldrig din e-mail eller dit
          telefonnummer offentligt.
        </p>
        <h3>Når I begge har en profil</h3>
        <p>
          I skriver sammen i en privat chat på siden. Den anden bruger ser dit navn, men ikke din
          e-mail. Når du får en ny besked, sender vi dig en e-mail med beskeden, så du ikke går glip
          af den.
        </p>
        <h3>Når opslaget er oprettet uden profil</h3>
        <p>
          Man kan oprette et opslag uden profil ved kun at oplyse sin e-mail. Skriver nogen til
          opslaget, sender vi beskeden videre fra info@hittegodscentralen.dk. Det betyder:
        </p>
        <ul>
          <li>
            Den, der skriver, får ikke opretterens e-mail at se. Vi videresender kun beskeden.
          </li>
          <li>
            Opretteren får beskeden sammen med afsenderens navn og e-mail og telefonnummer, hvis det
            er oplyst. Når du skriver til et opslag på denne måde, accepterer du, at vi giver disse
            oplysninger videre.
          </li>
          <li>
            Opretteren kan svare direkte på e-mailen. Svaret går fra opretterens egen e-mail, så
            afsenderen kan se den. Det er opretterens eget valg at svare.
          </li>
        </ul>
        <h3>Vores rolle</h3>
        <p>
          Vi gemmer beskeder, så samtalen kan ses af jer begge. Vi læser dem ikke løbende, men vi kan
          gennemgå beskeder og opslag, hvis vi får en anmeldelse, har mistanke om misbrug eller er
          forpligtet til det efter loven.
        </p>
      </>
    ),
  },
  {
    id: "aflevering",
    title: "Aflevering af genstande",
    body: (
      <>
        <p>
          Hittegodscentralen opbevarer ikke genstande og er ikke part i de aftaler, brugerne laver med
          hinanden. I aftaler selv, hvordan og hvor tingen bliver afleveret. Vi anbefaler, at I:
        </p>
        <ul>
          <li>mødes et offentligt sted, fx en station eller et butikscenter,</li>
          <li>beder om en beskrivelse eller et bevis, inden tingen bliver udleveret,</li>
          <li>aldrig betaler penge på forhånd eller giver koder og bankoplysninger.</li>
        </ul>
        <p>
          Hittegodscentralen erstatter ikke politiets hittegodskontor. Har du fundet noget af værdi,
          er det dit ansvar at følge reglerne for hittegods.
        </p>
      </>
    ),
  },
  {
    id: "regler",
    title: "Det må du ikke",
    body: (
      <ul>
        <li>oprette falske opslag eller give dig ud for at eje noget, der ikke er dit,</li>
        <li>bruge kontakten til svindel, chikane, trusler, reklame eller spam,</li>
        <li>kræve betaling eller dusør for at udlevere noget, du har fundet,</li>
        <li>indsamle andre brugeres oplysninger eller bruge dem til andet end opslaget,</li>
        <li>forsøge at omgå sikkerheden eller belaste siden, fx med automatiske programmer.</li>
      </ul>
    ),
  },
  {
    id: "moderering",
    title: "Hvis reglerne ikke bliver overholdt",
    body: (
      <p>
        Vi kan fjerne opslag og beskeder, der bryder vilkårene, og spærre eller slette konti. Er der
        tale om noget ulovligt, kan vi give oplysninger videre til politiet.
      </p>
    ),
  },
  {
    id: "mails",
    title: "E-mails fra os",
    body: (
      <p>
        Når du bruger Hittegodscentralen, sender vi e-mails, der hører til tjenesten: bekræftelse af
        din e-mail, nulstilling af adgangskode, besked om nye og ulæste beskeder, bekræftelse af nye
        opslag og besked, når et opslag snart udløber. Vi sender ikke reklamer.
      </p>
    ),
  },
  {
    id: "ansvar",
    title: "Ansvar",
    body: (
      <p>
        Vi gør vores bedste for, at siden virker, men vi kan ikke garantere, at den altid er
        tilgængelig, eller at en tabt ting bliver fundet. Vi er ikke ansvarlige for de oplysninger,
        brugerne skriver, for genstandenes stand eller for tab, der opstår i forbindelse med aftaler
        mellem brugere.
      </p>
    ),
  },
  {
    id: "persondata",
    title: "Dine personoplysninger",
    body: (
      <p>
        Vi behandler kun de oplysninger, der skal til for at drive tjenesten: dit navn, din e-mail,
        dine opslag og dine beskeder. Vi sælger dem ikke og deler dem kun som beskrevet ovenfor. Du kan
        læse mere i vores <Link href="/privatlivspolitik">privatlivspolitik</Link>.
      </p>
    ),
  },
  {
    id: "aendringer",
    title: "Ændringer og lovvalg",
    body: (
      <>
        <p>
          Vi kan ændre vilkårene. Ved væsentlige ændringer giver vi besked på siden eller på e-mail,
          inden de træder i kraft. Bruger du siden efter ændringen, accepterer du de nye vilkår.
        </p>
        <p>Vilkårene følger dansk ret.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Vilkår & betingelser"
      intro="Her kan du læse, hvad du siger ja til, når du bruger Hittegodscentralen, og hvordan vi håndterer kontakten mellem brugerne."
      updated={UPDATED}
      sections={SECTIONS}
    />
  );
}
