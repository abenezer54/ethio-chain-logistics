import {
  LandingNav,
  LandingHero,
  LandingBenefits,
  LandingFeatures,
  LandingHowItWorks,
  LandingStats,
  LandingNetwork,
  LandingCTA,
  LandingFooter,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <LandingHero />
      <LandingBenefits />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingStats />
      <LandingNetwork />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
