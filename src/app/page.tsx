"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemStrip } from "@/components/landing/ProblemStrip";
import { Features } from "@/components/landing/Features";
import { AICallout } from "@/components/landing/AICallout";
import { Roadmap } from "@/components/landing/Roadmap";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0A0A0A]" />;
  }

  return (
    <main className="bg-[#0A0A0A] min-h-screen text-[#F5F5F5] flex flex-col font-sans relative overflow-x-hidden">
      <AmbientBackground />
      <Navbar />
      <Hero />
      <ProblemStrip />
      <Features />
      <AICallout />
      <Roadmap />
      <Footer />
    </main>
  );
}
