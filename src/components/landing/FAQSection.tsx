import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  useEffect(() => {
    supabase
      .from("landing_content")
      .select("*")
      .eq("section", "faq")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setFaqs(
            data.map((d) => ({
              id: d.id,
              question: (d.content_value as any).question ?? "",
              answer: (d.content_value as any).answer ?? "",
            }))
          );
        }
      });
  }, []);

  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="border border-border/60 rounded-lg px-4 bg-card/40 shadow-sm">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
