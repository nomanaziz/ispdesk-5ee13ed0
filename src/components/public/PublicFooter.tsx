import { Wifi, Phone, Mail, MapPin } from "lucide-react";
import { NavLink } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ISP Desk</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              আপনার বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী। দ্রুত, নিরাপদ এবং নির্ভরযোগ্য ইন্টারনেট সংযোগ।
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">দ্রুত লিংক</h3>
            <ul className="space-y-2 text-sm">
              <li><NavLink to="/packages" className="hover:text-teal-400 transition-colors">প্যাকেজ সমূহ</NavLink></li>
              <li><NavLink to="/coverage" className="hover:text-teal-400 transition-colors">কভারেজ এরিয়া</NavLink></li>
              <li><NavLink to="/new-connection" className="hover:text-teal-400 transition-colors">নতুন কানেকশন</NavLink></li>
              <li><NavLink to="/quick-pay" className="hover:text-teal-400 transition-colors">বিল পরিশোধ</NavLink></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">সেবা সমূহ</h3>
            <ul className="space-y-2 text-sm">
              <li><NavLink to="/services" className="hover:text-teal-400 transition-colors">ব্রডব্যান্ড ইন্টারনেট</NavLink></li>
              <li><NavLink to="/services" className="hover:text-teal-400 transition-colors">ফাইবার অপটিক</NavLink></li>
              <li><NavLink to="/services" className="hover:text-teal-400 transition-colors">কর্পোরেট সংযোগ</NavLink></li>
              <li><NavLink to="/about" className="hover:text-teal-400 transition-colors">আমাদের সম্পর্কে</NavLink></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">যোগাযোগ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-teal-400" /> ০১XXXXXXXXX</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-teal-400" /> info@example.com</li>
              <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-teal-400 mt-0.5" /> আপনার ঠিকানা এখানে</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} ISP Desk। সর্বস্বত্ব সংরক্ষিত। Powered by ISP Desk ERP
        </div>
      </div>
    </footer>
  );
}
