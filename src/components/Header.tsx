"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/Button";
import { NotificationBell } from "@/components/NotificationBell";

export function Header({ provider }: { provider: string }) {
  const { data: session, status } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-zinc-900">
              Module Federation Catalog
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="h-8 w-20 animate-pulse rounded bg-zinc-200" />
            ) : session ? (
              <>
                <div>
                  <p className="cursor-pointer hover:border-b">
                    <Link href="/documentation/getting-started">
                      Documentation
                    </Link>
                  </p>
                </div>

                <NotificationBell />

                <DropdownMenu
                  open={userMenuOpen}
                  onOpenChange={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <DropdownMenuTrigger asChild>
                    <p className="cursor-pointer hover:border-b text-zinc-600">
                      {session.user?.name || session.user?.email}
                      <ChevronDown className="inline" color="#999" size={22} />
                    </p>
                  </DropdownMenuTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      className="bg-white p-4 pr-8 mr-2 border border-gray-200 rounded shadow-lg"
                      sideOffset={5}
                    >
                      {[
                        { label: "Dashboard", href: "/dashboard" },
                        {
                          label: "Notifications",
                          href: "/dashboard/notifications",
                        },
                        {
                          label: "Applications",
                          href: "/dashboard/applications",
                        },
                        {
                          label: "Subscriptions",
                          href: "/dashboard/subscriptions",
                        },
                        {
                          label: "API Tokens",
                          href: "/dashboard/api-tokens",
                        },
                        ...(session.user?.isAdmin
                          ? [
                              {
                                label: "Storage",
                                href: "/dashboard/admin",
                              },
                            ]
                          : []),
                      ].map((menuItem) => (
                        <DropdownMenuItem key={menuItem.label}>
                          <p className="hover:bg-zinc-200 p-1">
                            <Link
                              href={menuItem.href}
                              className="font-medium text-zinc-700"
                              onNavigate={() => setUserMenuOpen(!userMenuOpen)}
                            >
                              {menuItem.label}
                            </Link>
                          </p>
                        </DropdownMenuItem>
                      ))}

                      <div className="my-2 border-b border-gray-400"></div>

                      <Button onClick={() => signOut()} size="sm">
                        Sign out
                      </Button>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={() => signIn(provider, { redirectTo: "/" })}
                size="sm"
              >
                Sign in
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
