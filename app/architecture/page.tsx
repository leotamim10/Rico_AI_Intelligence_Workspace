import type { Metadata } from "next";

import ArchitectureConsumers from "./index";

export const metadata: Metadata = {
  title: "EcoFlow — Consumer Applications",
  description:
    "The four EcoFlow consumer surfaces — tenantWeb, centralWeb, posUi, WalpackUi — each reading the versioned snapshot contract from centralBackOffice.",
};

/** Route composition only — scopes the Slate & Rust theme to this page. */
export default function ArchitecturePage() {
  return (
    <main className="theme-slate-rust min-h-dvh bg-bg">
      <ArchitectureConsumers />
    </main>
  );
}
