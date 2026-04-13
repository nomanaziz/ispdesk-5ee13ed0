import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { OLTFeatureSection } from "@/components/landing/OLTFeatureSection";
import { PortalsSection } from "@/components/landing/PortalsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <OLTFeatureSection />
      <PortalsSection />
      <PricingSection />
      <FAQSection />
      <ContactSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
