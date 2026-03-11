"use client";

import React from "react";
import Tabs from "./components/tabs/page";
import Hero from "./components/hero/page";

export default function Page() {
  return (
    <div className="min-h-screen overflow-hidden">
      <main className="w-full relative bg-linear-to-br from-(--fifth) via-(--fourth) to-(--fifth)/70">
        {/* <Hero /> */}
        <Tabs />

        {/* <div className="absolute -top-1/4 -left-1/3 w-2/3 h-2/3 rounded-[360px] bg-(--fourth)/30 blur-3xl"/>
      <div className="absolute top-1/4 -right-1/3 w-2/3 h-2/3 rounded-[360px] bg-[#a89664]/30 blur-3xl"/> */}
        {/* <div className="absolute top-0 left-0 h-full w-1/4 bg-[var(--first)]" />
      <div className="absolute top-0 right-0 h-full w-3/4 bg-[var(--fifth)]/70" /> */}
      </main>
    </div>
  );
}
