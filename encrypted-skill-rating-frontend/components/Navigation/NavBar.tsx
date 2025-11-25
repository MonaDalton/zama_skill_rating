"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMetaMask } from "@/hooks/useWallet/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet/useMetaMaskEthersSigner";
import { useMemo } from "react";

export function NavBar() {
  const pathname = usePathname();
  const { isConnected, accounts, connect } = useMetaMask();
  const { chainId } = useMetaMaskEthersSigner();

  const displayAddress = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;
    const addr = accounts[0];
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, [accounts]);

  const networkName = useMemo(() => {
    if (chainId === 31337) return "Hardhat";
    if (chainId === 11155111) return "Sepolia";
    return chainId ? `Chain ${chainId}` : "Unknown";
  }, [chainId]);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/submit-rating", label: "Submit Rating" },
    { href: "/results", label: "View Results" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-neutral-900/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <span className="text-white font-bold text-lg">🔒</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Skill Rating Hub
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-3">
            {isConnected && chainId && (
              <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm">
                <div className="flex items-center space-x-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 opacity-75 animate-ping"></div>
                  </div>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{networkName}</span>
                </div>
                {displayAddress && (
                  <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                )}
                {displayAddress && (
                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{displayAddress}</span>
                )}
              </div>
            )}
            {!isConnected ? (
              <button
                onClick={connect}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium shadow-md">
                ✓ Connected
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}



