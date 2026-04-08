"use client";

import Community from "@/components/Community";
import Contact from "@/components/Contact";
import { Container } from "@/components/Container";
import Features from "@/components/Features";
import GrantPreview from "@/components/GrantPreview";
import Hero from "@/components/Hero";
import Impact from "@/components/Impact";
import PlatformOverview from "@/components/PlatformOverview";
import Testimonials from "@/components/Testimonials";
import FAQS from "@/components/FAQS";

export default function Home() {
  return (
    <div className="bg-background min-h-screen transition-colors duration-300">
      {/* Hero section */}
      <Container variant="hero">
        <Hero />
      </Container>

      {/* How It Works Section */}
      <Container variant="secondary">
        <PlatformOverview />
      </Container>

      {/* Preview of Grants Section */}
      <Container variant="primary">
        <GrantPreview />
      </Container>

      {/* Features Section*/}
      <Container variant="primary">
        <Features />
      </Container>

      {/* Benefits & Impact */}
      <Container variant="secondary">
        <Impact />
      </Container>

      {/* Collaborators Section */}
      <Container variant="primary">
        <Community />
      </Container>

      {/* Testimonials  */}
      {/* <Container variant="secondary">
        <Testimonials />
      </Container> */}

      {/* Contact Section */}
      <Container variant="primary">
        <Contact />
      </Container>

      {/* FAQ Section */}
      <Container variant="secondary">
        <FAQS maxItems={5} />
      </Container>
    </div>
  );
}
