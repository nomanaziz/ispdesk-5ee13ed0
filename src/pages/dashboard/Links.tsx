import { ImportantLinksSection } from "@/components/dashboard/ImportantLinksSection";

export default function Links() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">গুরুত্বপূর্ণ লিংক</h1>
        <p className="text-sm text-muted-foreground">
          প্রয়োজনীয় টুল ও সিস্টেমের লিংকসমূহ এক জায়গায়
        </p>
      </div>
      <ImportantLinksSection />
    </div>
  );
}
