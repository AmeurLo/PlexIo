"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Badges {
  lateRent: number;       // late + pending_confirmation rent payments
  openMaintenance: number; // open + in_progress maintenance requests
  unreadMessages: number;  // conversations with unread messages
}

const BadgeContext = createContext<Badges>({ lateRent: 0, openMaintenance: 0, unreadMessages: 0 });

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const [badges, setBadges] = useState<Badges>({ lateRent: 0, openMaintenance: 0, unreadMessages: 0 });

  const fetchBadges = useCallback(async () => {
    try {
      const [payments, maintenance, conversations] = await Promise.all([
        api.getRentPayments().catch(() => [] as any[]),
        api.getMaintenanceRequests().catch(() => [] as any[]),
        api.getConversations().catch(() => [] as any[]),
      ]);

      const lateRent = (payments as any[]).filter(
        (p: any) => p.status === "late" || p.status === "pending_confirmation"
      ).length;

      const openMaintenance = (maintenance as any[]).filter(
        (r: any) => r.status === "open" || r.status === "in_progress"
      ).length;

      // Count conversations that have unread messages (last message not from landlord)
      const unreadMessages = (conversations as any[]).filter(
        (c: any) => c.unread_count > 0 || c.has_unread === true
      ).length;

      setBadges({ lateRent, openMaintenance, unreadMessages });
    } catch {
      // Silently fail — badges are not critical
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    // Refresh every 60 seconds
    const interval = setInterval(fetchBadges, 60_000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  // Listen for events that should trigger a badge refresh
  useEffect(() => {
    const refresh = () => fetchBadges();
    window.addEventListener("domely:badgeRefresh", refresh);
    return () => window.removeEventListener("domely:badgeRefresh", refresh);
  }, [fetchBadges]);

  return <BadgeContext.Provider value={badges}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  return useContext(BadgeContext);
}
