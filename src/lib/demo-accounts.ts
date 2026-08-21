/**
 * Presentation/testing accounts. These are development credentials only and
 * are hidden on production builds via `demoAccountsEnabled`.
 */
export type DemoRole = "customer" | "technician" | "admin";

export const DEMO_ACCOUNTS: Record<DemoRole, { label: string; email: string; password: string }> = {
  customer: { label: "Customer Demo", email: "demo.customer@manorcraft.lk", password: "Demo@12345" },
  technician: {
    label: "Technician Demo",
    email: "demo.technician@manorcraft.lk",
    password: "Demo@12345",
  },
  admin: { label: "Admin Demo", email: "demo.admin@manorcraft.lk", password: "Demo@12345" },
};

export const demoAccountsEnabled = import.meta.env.DEV || import.meta.env["VITE_ENABLE_DEMO"] !== "false";
