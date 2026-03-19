import TenantLayout from "@/components/portal/TenantLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TenantLayout>{children}</TenantLayout>;
}
