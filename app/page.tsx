import { Dashboard } from '@/components/sections/Dashboard';
import { Hero } from '@/components/sections/Hero';
import { InsightFlow } from '@/components/sections/InsightFlow';
import { SignatureMoment } from '@/components/sections/SignatureMoment';

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
      <Dashboard />
      <SignatureMoment />
    </main>
  );
}
