import { ShieldCheck, Lock, Map, ListChecks, Network } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  return (
    <>
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-30 w-full bg-[#1B365D] shadow-sm">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between px-8 py-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <span className="bg-action rounded-full p-2 flex items-center justify-center">
              <Network className="text-white" size={24} />
            </span>
            <span className="text-white font-bold text-lg tracking-wide">
              Ethio-Chain
            </span>
          </div>
          {/* Center: Links */}
          <div className="hidden md:flex gap-8">
            {["Portals", "Documentation", "Resources"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-white hover:text-[#F37021] font-medium transition-colors duration-150"
              >
                {link}
              </a>
            ))}
          </div>
          {/* Right: Launch Portal Button */}
          <a
            href="/role-selection"
            className="bg-[#F37021] text-white font-semibold px-5 py-2 rounded-full shadow-lg hover:bg-[#D9621C] transition-all duration-150"
          >
            Launch Portal
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full bg-slate-50 py-32">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between px-8 gap-32">
          {/* Left */}
          <div className="flex-1 flex flex-col items-start gap-8">
            <span className="bg-slate-100 text-[#1B365D] font-bold px-4 py-1 rounded-full text-[11px] tracking-widest mb-2 uppercase">
              ETHIOPIA-DJIBOUTI TRADE CORRIDOR
            </span>
            <h1 className="text-[2.7rem] md:text-[4rem] font-extrabold leading-[1.1]">
              <span className="text-[#0F172A]">The Future of </span>
              <span className="text-[#F37021]">Trade Transparency</span>
            </h1>
            <p className="text-[#64748B] text-[20px] leading-relaxed max-w-2xl">
              Digitizing the Ethiopia-Djibouti supply chain for transparency,
              speed, and trust. Immutable docs, real-time tracking, and
              multi-actor governance.
            </p>
            <div className="flex gap-6 mt-8">
              <a
                href="/role-selection"
                className="bg-[#F37021] text-white font-bold px-6 py-3 rounded-[8px] shadow-[0_4px_24px_0_rgba(243,112,33,0.25)] hover:bg-[#D9621C] transition-all duration-150"
              >
                Launch Portal
              </a>
              <a
                href="#"
                className="border-2 border-[#0F172A] text-[#0F172A] font-bold px-6 py-3 rounded-[8px] bg-transparent hover:bg-slate-50 transition-all duration-150"
              >
                Track Shipment
              </a>
            </div>
          </div>
          {/* Right */}
          <div className="flex-1 relative flex items-center justify-center w-full min-h-[380px]">
            <Image
              src="/shipping-container-1.webp"
              alt="Blue and red containers"
              width={520}
              height={340}
              className="rounded-[40px] object-cover shadow-2xl w-full max-w-[600px] min-h-[340px]"
              priority
            />
            {/* Floating Card */}
            <div
              className="absolute left-0 -bottom-10 bg-white rounded-xl shadow-2xl px-7 py-5 flex items-center gap-4 border border-slate-100"
              style={{ minWidth: 240 }}
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-full bg-[#DCFCE7]">
                <ShieldCheck className="text-[#22C55E]" size={28} />
              </span>
              <div>
                <div className="text-[#1B365D] font-bold text-base">
                  Verified Nodes
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  128 Active Validators
                </div>
              </div>
            </div>
          </div>
          {/* End Hero Section */}
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full bg-white py-32">
        <div className="w-full max-w-[1440px] mx-auto px-8">
          <div className="mb-16 text-center">
            <h2 className="text-[#1B365D] font-bold text-[2.25rem] leading-tight mb-2">
              Enterprise Blockchain Solutions
            </h2>
            <p className="text-[#64748B] text-base max-w-2xl mx-auto">
              Three pillars that make Ethio-Chain the most trusted logistics
              platform for the Ethiopia-Djibouti corridor.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature Card 1 */}
            <div className="group bg-[#F8FAFC] rounded-[24px] border border-[#E2E8F0] p-8 flex flex-col items-start gap-4 transition-transform duration-200 hover:-translate-y-2">
              <span className="bg-[#1B365D1A] rounded-lg p-2 transition-colors duration-200 group-hover:bg-[#F37021]">
                <Lock
                  className="text-[#1B365D] group-hover:text-white"
                  size={28}
                />
              </span>
              <h3 className="font-bold text-xl text-[#1B365D]">
                Immutable Security
              </h3>
              <p className="text-[#64748B] text-[15px] leading-relaxed">
                Every document is hashed and anchored to prevent tampering,
                ensuring trust at every step.
              </p>
            </div>
            {/* Feature Card 2 */}
            <div className="group bg-[#F8FAFC] rounded-[24px] border border-[#E2E8F0] p-8 flex flex-col items-start gap-4 transition-transform duration-200 hover:-translate-y-2">
              <span className="bg-[#1B365D1A] rounded-lg p-2 transition-colors duration-200 group-hover:bg-[#F37021]">
                <Map
                  className="text-[#1B365D] group-hover:text-white"
                  size={28}
                />
              </span>
              <h3 className="font-bold text-xl text-[#1B365D]">
                Real-Time Tracking
              </h3>
              <p className="text-[#64748B] text-[15px] leading-relaxed">
                Live state-machine tracks shipments from Addis Ababa to
                Djibouti, reducing delays and uncertainty.
              </p>
            </div>
            {/* Feature Card 3 */}
            <div className="group bg-[#F8FAFC] rounded-[24px] border border-[#E2E8F0] p-8 flex flex-col items-start gap-4 transition-transform duration-200 hover:-translate-y-2">
              <span className="bg-[#1B365D1A] rounded-lg p-2 transition-colors duration-200 group-hover:bg-[#F37021]">
                <ListChecks
                  className="text-[#1B365D] group-hover:text-white"
                  size={28}
                />
              </span>
              <h3 className="font-bold text-xl text-[#1B365D]">
                Multi-Actor Governance
              </h3>
              <p className="text-[#64748B] text-[15px] leading-relaxed">
                Digital sign-offs and RBAC ensure only authorized parties can
                progress each shipment milestone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Network Infrastructure Bar - Floating Card (Responsive) */}
      <section className="w-full bg-white py-16 flex justify-center relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20 bg-[#1E293B] rounded-[32px] shadow-2xl flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between px-5 md:px-10 py-8 gap-8 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          {/* Status & Icon */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full md:w-auto">
            <span className="flex items-center justify-center h-14 w-14 rounded-full border-2 border-[#334155] bg-[#1E293B]">
              <Network className="text-white" size={32} />
            </span>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-white font-bold text-lg leading-tight text-center sm:text-left">
                Network Infrastructure
              </span>
              <span className="flex items-center gap-2 mt-1">
                <span className="h-3 w-3 rounded-full bg-[#22C55E] animate-pulse border-2 border-[#1E293B]"></span>
                <span className="text-[#94A3B8] text-sm font-medium">
                  Blockchain Heartbeat:{" "}
                  <span className="font-semibold">Online</span>
                </span>
              </span>
            </div>
          </div>
          {/* Action Button */}
          <a
            href="#"
            className="group flex items-center justify-center gap-2 border border-white/30 rounded-full px-6 py-3 bg-white/5 text-white font-semibold text-sm transition-all duration-150 hover:bg-white/10 hover:border-white/60 w-full md:w-auto"
            style={{ minWidth: 170 }}
          >
            View Network Stats
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </span>
          </a>
        </div>
      </section>

      {/* Enterprise Footer - Equally Spaced Columns */}
      <footer className="bg-[#020617] w-full mt-auto border-t border-[#1E293B]">
        <div className="w-full max-w-[1440px] mx-auto px-8 py-20 flex flex-col md:flex-row md:items-start md:justify-between gap-16">
          {/* Brand Column - Far Left */}
          <div className="flex-1 flex flex-col items-center md:items-start gap-4 min-w-[200px]">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#F37021] rounded-full p-2 flex items-center justify-center">
                <Network className="text-white" size={28} />
              </span>
              <span className="text-white font-bold text-xl tracking-wide">
                Ethio-Chain Logistics
              </span>
            </div>
            <div className="text-[#64748B] text-sm leading-relaxed max-w-xs text-center md:text-left">
              Revolutionizing cross-border trade with distributed ledger
              technology.
              <br />
              Transparent. Secure. Efficient.
              <br />
              Ethiopia-Djibouti corridor, reimagined.
            </div>
            <div className="flex gap-2 mt-4">
              {/* Globe Icon */}
              <a
                href="#"
                className="group flex items-center justify-center h-9 w-9 rounded-full border border-white/20 bg-transparent hover:bg-[#1E293B]/60 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white group-hover:text-[#F37021]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 0c2.21 0 4 4.03 4 9s-1.79 9-4 9-4-4.03-4-9 1.79-9 4-9z"
                  />
                </svg>
              </a>
              {/* Mail Icon */}
              <a
                href="#"
                className="group flex items-center justify-center h-9 w-9 rounded-full border border-white/20 bg-transparent hover:bg-[#1E293B]/60 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white group-hover:text-[#F37021]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 8.25V17a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17V8.25m18 0A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25m18 0v.243a2.25 2.25 0 01-.659 1.591l-6.75 6.75a2.25 2.25 0 01-3.182 0l-6.75-6.75A2.25 2.25 0 013 8.493V8.25"
                  />
                </svg>
              </a>
            </div>
          </div>
          {/* Quick Links - Center */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-[200px]">
            <span className="text-white font-bold mb-2 uppercase tracking-wide text-[15px]">
              Quick Links
            </span>
            <a
              href="#"
              className="text-[#94A3B8] hover:text-[#F37021] text-sm transition-colors leading-8"
            >
              Portals
            </a>
            <a
              href="#"
              className="text-[#94A3B8] hover:text-[#F37021] text-sm transition-colors leading-8"
            >
              Documentation
            </a>
            <a
              href="#"
              className="text-[#94A3B8] hover:text-[#F37021] text-sm transition-colors leading-8"
            >
              Resources
            </a>
          </div>
          {/* Support - Far Right */}
          <div className="flex-1 flex flex-col items-center md:items-end gap-2 min-w-[200px]">
            <span className="text-white font-bold mb-2 uppercase tracking-wide text-[15px]">
              Support
            </span>
            <a
              href="#"
              className="text-[#94A3B8] hover:text-[#F37021] text-sm transition-colors leading-8"
            >
              Contact
            </a>
            <a
              href="#"
              className="text-[#94A3B8] hover:text-[#F37021] text-sm transition-colors leading-8"
            >
              Help Center
            </a>
            <a
              href="#"
              className="text-[#94A3B8] hover:text-[#F37021] text-sm transition-colors leading-8"
            >
              Status
            </a>
          </div>
        </div>
        <div className="border-t border-[#1E293B] pt-6 pb-4 flex flex-col md:flex-row items-center justify-between px-6">
          <span className="text-[#64748B] text-xs mb-2 md:mb-0">
            © 2026 Ethio-Chain Logistics. All rights reserved.
          </span>
          <span className="flex items-center gap-2 text-[#22C55E] text-xs">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse"></span>
            Online
          </span>
        </div>
      </footer>
    </>
  );
}
