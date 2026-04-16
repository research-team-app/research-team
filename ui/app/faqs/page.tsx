"use client";

import Accordion from "@/components/ui/Accordion";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/SectionHeader";
import { faqs } from "@/components/FAQS";

type FAQSProps = {
  maxItems?: number;
};

const FAQS = ({ maxItems }: FAQSProps) => {
  return (
    <section className="pt-10">
      <SectionHeader
        sectionName="Questions Answered"
        title="Frequently Asked Questions"
        description="Find answers to common questions about our research platform and how it can help you"
      />
      <Accordion
        items={faqs.slice(0, maxItems)}
        defaultOpenIndex={0}
        className="my-8 sm:my-4"
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
