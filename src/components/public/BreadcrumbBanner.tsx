import { NavLink } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbBannerProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
}

export function BreadcrumbBanner({ title, subtitle, breadcrumbs = [] }: BreadcrumbBannerProps) {
  return (
    <section className="relative bg-gradient-to-r from-cyan-700 via-teal-700 to-teal-800 py-16 md:py-20 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-teal-300 rounded-full blur-3xl" />
      </div>

      {/* Grid overlay pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3">{title}</h1>
        {subtitle && <p className="text-teal-100 text-lg max-w-2xl mx-auto mb-6">{subtitle}</p>}

        {/* Breadcrumb trail */}
        <nav className="flex items-center justify-center gap-2 text-sm text-teal-200">
          <NavLink to="/" className="flex items-center gap-1 hover:text-white transition-colors">
            <Home className="h-3.5 w-3.5" /> হোম
          </NavLink>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-teal-400" />
              {crumb.to ? (
                <NavLink to={crumb.to} className="hover:text-white transition-colors">{crumb.label}</NavLink>
              ) : (
                <span className="text-white font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
