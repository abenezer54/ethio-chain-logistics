import {
  ShoppingCart,
  Store,
  Anchor,
  Truck,
  ShieldCheck,
  Settings,
} from "lucide-react";

const roles = [
  {
    title: "Importer",
    description:
      "Access shipment tracking, document uploads, and manage your imports.",
    icon: <ShoppingCart className="text-[#0F172A]" size={32} />, // Navy
    href: "#",
  },
  {
    title: "Seller",
    description: "Manage sales, contracts, and shipment handoffs to importers.",
    icon: <Store className="text-[#0F172A]" size={32} />,
    href: "#",
  },
  {
    title: "ESL Agent",
    description:
      "Coordinate logistics, verify documents, and facilitate smooth trade.",
    icon: <Anchor className="text-[#0F172A]" size={32} />,
    href: "#",
  },
  {
    title: "Transporter",
    description:
      "View assigned shipments, update delivery status, and manage routes.",
    icon: <Truck className="text-[#0F172A]" size={32} />,
    href: "#",
  },
  {
    title: "Customs Officer",
    description: "Review and approve customs documents, ensure compliance.",
    icon: <ShieldCheck className="text-[#0F172A]" size={32} />,
    href: "#",
  },
  {
    title: "System Admin",
    description: "Manage users, permissions, and system settings.",
    icon: <Settings className="text-[#0F172A]" size={32} />,
    href: "#",
  },
];

function RoleCard({ title, description, icon, href }: any) {
  return (
    <div className="group bg-white border border-[#E2E8F0] rounded-[24px] p-8 flex flex-col h-full shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-[#F1F5F9] rounded-lg p-3 flex items-center justify-center">
          {icon}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-[#0F172A] text-lg mb-1">{title}</h3>
        <p className="text-[#64748B] text-[14px] leading-relaxed mb-4">
          {description}
        </p>
      </div>
      <a
        href={href}
        className="mt-auto font-bold text-[#0F172A] flex items-center gap-1 transition-colors group-hover:text-[#F37021]"
      >
        Sign Up / Login
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
          &rarr;
        </span>
      </a>
    </div>
  );
}

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="w-full flex flex-col items-center justify-center pt-20 pb-10">
        <h1 className="text-5xl font-extrabold text-[#0F172A] mb-4 text-center">
          Welcome to the Ethio-Chain Portal
        </h1>
        <p className="text-[#64748B] text-lg max-w-2xl text-center">
          Select your role to access the platform. Each persona has a tailored
          experience for secure, transparent, and efficient trade operations.
        </p>
      </header>
      {/* Role Cards Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {roles.map((role) => (
            <RoleCard key={role.title} {...role} />
          ))}
        </div>
      </main>
      {/* Footer */}
      <footer className="w-full flex flex-col items-center gap-4 pb-8 mt-auto">
        <div className="flex gap-6 text-[#94A3B8] text-sm">
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Terms
          </a>
          <a href="#" className="hover:underline">
            Help
          </a>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[#0F172A] text-xs font-semibold bg-[#F1F5F9] px-3 py-1 rounded-full">
          <ShieldCheck className="text-[#22C55E]" size={16} />
          Trust Blue Certified
        </div>
      </footer>
    </div>
  );
}
