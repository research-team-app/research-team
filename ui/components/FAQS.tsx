"use client";

import Accordion from "@/components/ui/Accordian";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/SectionHeader";

export const faqs = [
  {
    question: "How does the grant matching system work?",
    answer:
      "Our system analyzes your research profile and interests to surface relevant grant opportunities. The more complete your profile, the more targeted your recommendations.",
  },
  {
    question: "Can I collaborate with researchers from different institutions?",
    answer:
      "Absolutely! Our platform is designed to facilitate collaboration across institutional boundaries. You can search for researchers based on expertise, connect with them through our secure messaging system, and use our collaborative tools to work together regardless of your physical locations.",
  },
  {
    question: "Is my research data secure on your platform?",
    answer:
      "Yes. We implement security best practices including strict access controls and data privacy protections. Your research data remains your intellectual property, and you maintain control over who can access your work.",
  },
  {
    question:
      "How can I showcase my research profile to potential collaborators?",
    answer:
      "Your researcher profile on our platform highlights your expertise, publications, current projects, and collaboration interests. You can customize your visibility settings, showcase your achievements, and make yourself discoverable to relevant researchers in your field or interdisciplinary areas.",
  },
  {
    question: "Are there fees associated with using the platform?",
    answer: "No, all features are completely free to use.",
  },
];

type FAQSProps = {
  maxItems?: number;
};

const FAQS = ({ maxItems }: FAQSProps) => {
  return (
    <section className="pt-6">
      <SectionHeader
        sectionName="Questions Answered"
        title="Frequently Asked Questions"
        description="Find answers to common questions about our research platform and how it can help you"
      />
      <Accordion
        items={faqs.slice(0, maxItems)}
        defaultOpenIndex={0}
        className="my-4"
      />

      {maxItems && (
        <div className="pb-4 text-center">
          <Button variant="outline" intent="primary" href="/faqs">
            Browse all FAQs
          </Button>
        </div>
      )}
    </section>
  );
};

export default FAQS;
