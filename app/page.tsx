import AboutTeaser from "./components/AboutTeaser";
import Hero from "./components/Hero";
import LatestItems from "./components/LatestItems";

export default function Home() {
  return (
    <main>
      <Hero />
      <LatestItems />
      <AboutTeaser />
    </main>
  );
}
