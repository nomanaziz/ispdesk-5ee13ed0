import { Wifi, Phone, Mail, MapPin, Facebook, Youtube, MessageCircle, ExternalLink } from "lucide-react";
import { NavLink } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-white block">ISP Desk</span>
                <span className="text-[10px] text-slate-500 block">ইন্টারনেট সেবা প্রদানকারী</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              আপনার বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী। দ্রুত, নিরাপদ এবং নির্ভরযোগ্য ফাইবার অপটিক ইন্টারনেট সংযোগ।
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-cyan-600 flex items-center justify-center transition-colors" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-red-600 flex items-center justify-center transition-colors" aria-label="YouTube">
                <Youtube className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-green-600 flex items-center justify-center transition-colors" aria-label="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">দ্রুত লিংক</h3>
            <ul className="space-y-3 text-sm">
              <li><NavLink to="/packages" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />প্যাকেজ সমূহ</NavLink></li>
              <li><NavLink to="/coverage" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />কভারেজ এরিয়া</NavLink></li>
              <li><NavLink to="/new-connection" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />নতুন কানেকশন</NavLink></li>
              <li><NavLink to="/quick-pay" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />বিল পরিশোধ</NavLink></li>
              <li><NavLink to="/offers" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />অফার সমূহ</NavLink></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">রিসোর্স</h3>
            <ul className="space-y-3 text-sm">
              <li><NavLink to="/services" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />সেবা সমূহ</NavLink></li>
              <li><NavLink to="/about" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />আমাদের সম্পর্কে</NavLink></li>
              <li><NavLink to="/contact" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />যোগাযোগ</NavLink></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />গোপনীয়তা নীতি</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />শর্তাবলী</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">যোগাযোগ</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">হেল্পলাইন</p>
                  <p className="text-white">০৯৬৭৮-১২৩৪৫৬</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">ইমেইল</p>
                  <p className="text-white">info@ispdesk.com</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">অফিস</p>
                  <p className="text-white">আপনার ঠিকানা, বাংলাদেশ</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} ISP Desk। সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p className="text-sm text-slate-600">
            Powered by <span className="text-cyan-400 font-medium">ISP Desk ERP</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
