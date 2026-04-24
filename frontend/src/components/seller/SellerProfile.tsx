"use client";
import React from "react";

type Profile = {
  company_name?: string;
  full_name?: string;
  phone?: string;
  company_address?: string;
};

export default function SellerProfile({
  profile,
  onSave,
}: {
  profile?: Profile;
  onSave?: (p: Profile) => void;
}) {
  const [company, setCompany] = React.useState(profile?.company_name || "");
  const [fullName, setFullName] = React.useState(profile?.full_name || "");
  const [phone, setPhone] = React.useState(profile?.phone || "");
  const [address, setAddress] = React.useState(profile?.company_address || "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (onSave) {
          onSave({
            company_name: company,
            full_name: fullName,
            phone,
            company_address: address,
          });
        }
      }}
    >
      <div>
        <label>Company</label>
        <input value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <div>
        <label>Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label>Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <button type="submit">Save</button>
    </form>
  );
}
