"use client";
import { useState } from "react";
import {
  User,
  FileText,
  LogOut,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
} from "lucide-react";

const admissions = [
  {
    id: 1,
    applicant: "Abenezer",
    role: "Importer",
    documentType: "Trade License",
    submitted: "2 hours ago",
    status: "pending",
  },
  {
    id: 2,
    applicant: "Sara",
    role: "Seller",
    documentType: "ID Card",
    submitted: "1 hour ago",
    status: "pending",
  },
  {
    id: 3,
    applicant: "Yonas",
    role: "Transporter",
    documentType: "Vehicle Registration",
    submitted: "30 minutes ago",
    status: "pending",
  },
];

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="flex flex-col w-64 h-screen bg-[#1B365D] text-white fixed left-0 top-0 z-30">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[#22376A]">
        <User className="text-white" size={28} />
        <span className="font-bold text-xl tracking-wide">Super Admin</span>
      </div>
      <nav className="flex-1 flex flex-col gap-2 px-4 py-6">
        <a
          href="#"
          className={`rounded-lg px-4 py-2 font-semibold flex items-center gap-2 ${
            active === "dashboard"
              ? "bg-[#0F172A] text-white"
              : "text-[#B6C3D1] hover:bg-[#22376A] hover:text-white"
          }`}
        >
          Dashboard
        </a>
        <a
          href="#"
          className={`rounded-lg px-4 py-2 font-semibold flex items-center gap-2 ${
            active === "admissions"
              ? "bg-[#0F172A] text-white"
              : "text-[#B6C3D1] hover:bg-[#22376A] hover:text-white"
          }`}
        >
          Pending Approvals
        </a>
      </nav>
      <div className="mt-auto px-6 pb-6">
        <button className="w-full flex items-center gap-2 justify-center bg-[#22376A] hover:bg-[#F37021] hover:text-white text-[#B6C3D1] font-semibold py-2 rounded-lg transition-all">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}

function StatusDot() {
  return (
    <span className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse border-2 border-white inline-block mr-2"></span>
  );
}

function AdmissionTable({ onReview }: { onReview: (row: any) => void }) {
  return (
    <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0F172A]">
          Pending Admissions
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-[#0F172A] font-semibold rounded-lg border border-[#E2E8F0] hover:bg-[#F37021] hover:text-white transition-all">
          <Download size={18} /> Export Report
        </button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-[#64748B] text-sm">
            <th className="py-2">Applicant</th>
            <th className="py-2">Document Type</th>
            <th className="py-2">Submitted</th>
            <th className="py-2">Status</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {admissions.map((row) => (
            <tr
              key={row.id}
              className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC]"
            >
              <td className="py-3 font-semibold text-[#0F172A]">
                {row.applicant}{" "}
                <span className="text-xs text-[#64748B]">- {row.role}</span>
              </td>
              <td className="py-3">
                <span className="bg-[#F1F5F9] text-[#0F172A] px-3 py-1 rounded-full text-xs font-medium">
                  {row.documentType}
                </span>
              </td>
              <td className="py-3 text-[#64748B]">{row.submitted}</td>
              <td className="py-3">
                <StatusDot />
                <span className="text-[#FBBF24] font-medium">
                  Pending Review
                </span>
              </td>
              <td className="py-3">
                <button
                  className="bg-[#F37021] hover:bg-[#D9621C] text-white font-bold px-4 py-2 rounded-full transition-all"
                  onClick={() => onReview(row)}
                >
                  Review Documents
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewDrawer({ open, onClose, row }: any) {
  if (!open || !row) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose}></div>
      {/* Drawer */}
      <div className="ml-auto w-full max-w-xl h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-xl font-bold text-[#0F172A]">Review Documents</h3>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#F37021]"
          >
            <XCircle size={24} />
          </button>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-y-auto">
          {/* Document Preview */}
          <div className="flex-1 bg-[#F8FAFC] rounded-lg flex items-center justify-center min-h-[220px]">
            <FileText className="text-[#B6C3D1]" size={64} />
          </div>
          {/* Checklist */}
          <div className="flex-1 flex flex-col gap-4">
            <h4 className="font-semibold text-[#0F172A] mb-2">
              Verification Checklist
            </h4>
            <ul className="flex flex-col gap-2 text-[#64748B] text-sm">
              <li>
                <input type="checkbox" className="mr-2" /> Company Name matches
                license
              </li>
              <li>
                <input type="checkbox" className="mr-2" /> Expiry date is valid
              </li>
              <li>
                <input type="checkbox" className="mr-2" /> Document is clear and
                legible
              </li>
              <li>
                <input type="checkbox" className="mr-2" /> All required pages
                present
              </li>
            </ul>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold py-3 rounded-full transition-all flex items-center justify-center gap-2">
            <CheckCircle size={20} /> Admit User
          </button>
          <button className="flex-1 bg-[#F37021] hover:bg-[#D9621C] text-white font-bold py-3 rounded-full transition-all flex items-center justify-center gap-2">
            <AlertTriangle size={20} /> Request Info
          </button>
          <button className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold py-3 rounded-full transition-all flex items-center justify-center gap-2">
            <XCircle size={20} /> Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar active="dashboard" />
      <main className="flex-1 ml-64 p-10">
        <h1 className="text-3xl font-extrabold text-[#0F172A] mb-2">
          Admissions & Verification
        </h1>
        <AdmissionTable
          onReview={(row) => {
            setSelectedRow(row);
            setDrawerOpen(true);
          }}
        />
      </main>
      <ReviewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        row={selectedRow}
      />
    </div>
  );
}
