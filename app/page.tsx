"use client";

import { useEffect } from "react";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  // PWA detection: if running as installed PWA, redirect to /app
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPWA = window.matchMedia("(display-mode: standalone)").matches;
      if (isPWA) {
        window.location.href = "/app";
      }
    }
  }, []);

  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </main>
  );
}
