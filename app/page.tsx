"use client";

import React from "react";
import Tabs from "./components/tabs/Tabs"; // Importálás az új helyről

export default function Page() {
  return (
    <div className="min-h-screen overflow-hidden">
      <main className="w-full relative bg-gradient-to-br from-[var(--fifth)] via-[var(--fourth)] to-[var(--fifth)]/70">
        {/* <div className="absolute top-0 left-0 h-full w-1/4 bg-[var(--first)]" />
      <div className="absolute top-0 right-0 h-full w-3/4 bg-[var(--fifth)]/70" /> */}
        <Tabs />
      </main>
    </div>
  );
}