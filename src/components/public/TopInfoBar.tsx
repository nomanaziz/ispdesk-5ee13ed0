import { Phone, Facebook, Youtube, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function TopInfoBar() {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-900 text-slate-300 text-xs py-2 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="tel:09678123456" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Phone className="h-3 w-3" />
            <span>{t("হেল্পলাইন: ০৯৬৭৮-১২৩৪৫৬", "Helpline: 09678-123456")}</span>
          </a>
          <span className="text-slate-600">|</span>
          <span>{t("সেবা সময়: সকাল ৯টা - রাত ১০টা", "Service hours: 9 AM - 10 PM")}</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className="hover:text-white transition-colors" aria-label="Facebook">
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a href="#" className="hover:text-white transition-colors" aria-label="YouTube">
            <Youtube className="h-3.5 w-3.5" />
          </a>
          <a href="#" className="hover:text-white transition-colors" aria-label="WhatsApp">
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
