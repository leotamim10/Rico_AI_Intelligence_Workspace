import { Hero } from "@/components/sections/Hero";
import { InsightFlow } from "@/components/sections/InsightFlow";

/**
 * Page composition. No logic, no styles beyond section ordering.
 * Sections are added block by block:
 *   Hero · InsightFlow · Dashboard · SignatureMoment
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <InsightFlow />
    </main>
  );
}
