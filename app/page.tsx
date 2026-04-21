import { LandingNavbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { KnowledgeBaseSection } from "@/components/landing/knowledge-base-section"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FinalCta } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <div style={{ background: "#030712" }}>
      <LandingNavbar isAuthenticated={false} />
      <Hero />
      <KnowledgeBaseSection />
      <Features />
      <HowItWorks />
      <FinalCta />
      <Footer />
    </div>
  )
}
