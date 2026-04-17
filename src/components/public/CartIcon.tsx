import { ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "@/stores/useCart";

export function CartIcon() {
  const count = useCart((s) => s.count());
  return (
    <NavLink to="/cart" className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="কার্ট">
      <ShoppingCart className="h-5 w-5 text-slate-700" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </NavLink>
  );
}
