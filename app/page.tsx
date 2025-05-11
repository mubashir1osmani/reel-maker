"use client";

import Hero from "@/components/hero";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero section */}
      <div className="bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
        <Hero />
        <Footer />
      </div>
    </main>
  );
}