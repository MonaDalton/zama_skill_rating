"use client";

import Link from "next/link";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet/useMetaMaskEthersSigner";

export default function Dashboard() {
  const { isConnected, accounts } = useMetaMaskEthersSigner();

  if (!isConnected || !accounts || accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-4">
          <span className="text-2xl">👤</span>
        </div>
        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Please connect your wallet to view your dashboard
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Connect your MetaMask wallet to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Overview of your skill rating participation
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Current Round Card */}
        <div className="p-6 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-lg card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
              Active
            </div>
          </div>
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Current Round</h3>
          <p className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">Round #1</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">Active assessment period</p>
        </div>

        {/* Rating Status Card */}
        <div className="p-6 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-lg card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Ratings Submitted</h3>
          <p className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">0</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">members rated</p>
        </div>

        {/* Overall Score Card */}
        <div className="p-6 border-2 border-orange-200 dark:border-orange-800 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 shadow-lg card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Your Score</h3>
          <p className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">--</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">Encrypted (decrypt to view)</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/submit-rating"
          className="group p-8 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <span className="text-2xl">✍️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">Submit New Rating</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Rate team members on multiple skill dimensions. All ratings are encrypted before submission.
              </p>
              <div className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">
                Start rating →
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/results"
          className="group p-8 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <span className="text-2xl">📊</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">View Results</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Decrypt and view your encrypted skill ratings with detailed breakdowns and visualizations.
              </p>
              <div className="mt-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">
                View results →
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}



