"use client";

import React from "react";
import Tabs from "./components/tabs/Tabs"; // Importálás az új helyről

export default function Page() {
  return (
    <div className="bg-[var(--first)] min-h-screen overflow-hidden">
      <main className="w-full">
        <Tabs />
      </main>
    </div>
  );
}