import { createFileRoute } from "@tanstack/react-router";
import { SoilCalculator } from "@/components/soil-calculator";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <SoilCalculator />
    </main>
  );
}
