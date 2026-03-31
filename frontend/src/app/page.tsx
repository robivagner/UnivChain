"use client";
import { ConnectKitButton } from "connectkit";
import { AdminPanel } from "../components/AdminPanel";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6 border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          UnivChain Portal
        </h1>
        <p className="text-slate-500 text-center max-w-xs">
          Sistem descentralizat de management universitar.
        </p>
        <ConnectKitButton />
        <AdminPanel />
      </div>
    </main>
  );
}