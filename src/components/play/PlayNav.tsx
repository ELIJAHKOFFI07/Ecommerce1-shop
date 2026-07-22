"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User, Store } from "lucide-react";
import { useCart } from "@/lib/cart";

const items = [
  { href: "/play", label: "Accueil", icon: Home },
  { href: "/play/search", label: "Recherche", icon: Search },
  { href: "/play/sell", label: "Vendre", icon: Store },
  { href: "/play/cart", label: "Panier", icon: ShoppingCart },
  { href: "/play/account", label: "Compte", icon: User },
];

export function PlayNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/play" className="text-lg font-bold text-gold">
            ElijahShop
          </Link>
          <nav className="hidden gap-6 text-sm md:flex">
            {items.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/play" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 ${
                    active ? "text-gold" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-4 w-4" />
                    {href === "/play/cart" && count > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-black">
                        {count}
                      </span>
                    )}
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Bottom bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/play" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] ${
                active ? "text-gold" : "text-muted"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {href === "/play/cart" && count > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-black">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
