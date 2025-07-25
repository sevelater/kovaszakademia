"use client";

import React from 'react';
import Tabs from "./components/tabs/page";

export default function Page() {
  return (
    <div className="bg-[var(--first)] h-screen overflow-hidden">
      <div className="w-full">
        {/* <img src="/jenoi_kep.jpg" alt=""></img> */}
      </div>
      <main className="w-full m-10">
        <Tabs />
      </main>
    </div>
  );
}