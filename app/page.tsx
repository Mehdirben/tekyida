"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const [isStandalone, setIsStandalone] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      router.replace("/app");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(standalone);
  }, [router]);

  if (isStandalone) return null;

  return (
    <>
      {/* Mesh gradient background — visible everywhere through glass elements */}
      <div className="mesh-gradient" />

      {/* Content */}
      <div className="safe-content-x relative z-10">
        <Header />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
}
