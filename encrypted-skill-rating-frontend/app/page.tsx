"use client";

import Link from "next/link";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet/useMetaMaskEthersSigner";

export default function Home() {
  const { isConnected } = useMetaMaskEthersSigner();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-6 shadow-xl">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Encrypted Skill Rating Hub
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-3xl mx-auto">
            Privacy-Preserving, Verifiable Team Assessment Platform
            <br />
            <span className="text-lg text-neutral-500 dark:text-neutral-500">
              Rate team members anonymously with fully encrypted on-chain calculations
            </span>
          </p>
          
          {!isConnected && (
            <div className="flex items-center justify-center space-x-4">
              <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 font-medium">
                Connect your wallet to get started
              </div>
            </div>
          )}
        </div>
        
        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-8 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl card-hover group">
            <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-100">100% Encrypted Ratings</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              All ratings are encrypted using FHEVM and computed on-chain without revealing individual scores to anyone, including admins.
            </p>
          </div>
          
          <div className="p-8 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl card-hover group">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-100">Verifiable Calculations</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Transparent and verifiable scoring mechanism with cryptographic proofs, ensuring fairness without compromising privacy.
            </p>
          </div>
          
          <div className="p-8 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl card-hover group">
            <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-100">Anonymous & Fair</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Anonymous rating system ensuring fair and unbiased assessments with weighted multi-dimensional scoring.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        {isConnected && (
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/submit-rating"
              className="p-6 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-all duration-200 card-hover group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg">✍️</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-neutral-900 dark:text-neutral-100">Submit Rating</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Rate team members on their skills</p>
                </div>
              </div>
            </Link>

            <Link
              href="/results"
              className="p-6 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 transition-all duration-200 card-hover group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-neutral-900 dark:text-neutral-100">View Results</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Decrypt and view your encrypted results</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}



