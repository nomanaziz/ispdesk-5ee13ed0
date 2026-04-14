const logos = [
  { name: "Google", color: "#4285F4" },
  { name: "Facebook", color: "#1877F2" },
  { name: "YouTube", color: "#FF0000" },
  { name: "Netflix", color: "#E50914" },
  { name: "TikTok", color: "#000000" },
  { name: "BDIX", color: "#0891B2" },
  { name: "Steam", color: "#1B2838" },
  { name: "Akamai", color: "#0098D6" },
  { name: "Cloudflare", color: "#F38020" },
  { name: "Amazon", color: "#FF9900" },
];

export function LogoMarquee() {
  return (
    <section className="py-8 bg-white border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-4 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">ক্যাশ সার্ভার সমূহ</p>
      </div>
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...logos, ...logos].map((logo, i) => (
            <div key={i} className="mx-8 flex-shrink-0 flex items-center gap-2 text-slate-400">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: logo.color }}>
                {logo.name.charAt(0)}
              </div>
              <span className="text-sm font-medium">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
