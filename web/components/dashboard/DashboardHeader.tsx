"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";
import { getUser, getInitials, logout } from "@/lib/auth";

interface Props {
  onMenuClick: () => void;
}

export default function DashboardHeader({ onMenuClick }: Props) {
  const { lang, setLang } = useLanguage();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const initials = getInitials(user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read localStorage only on the client to avoid SSR hydration mismatch
  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-14 flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-3">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Menu"
      >
        <Icon name="menu" size={20} />
      </button>

      {/* Mobile logo */}
      <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
        <img src="/logo.svg" alt="Domely" width={24} height={24} className="flex-shrink-0" />
        <span className="brand-name text-[16px] text-gray-900 dark:text-white">Domely</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Lang toggle */}
      <button
        onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {lang === "fr" ? "EN" : "FR"}
      </button>

      {/* Avatar + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
          <span className="hidden sm:block text-[13px] font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
            {user?.full_name || user?.email || "Account"}
          </span>
          <Icon name="chevron-down" size={14} className="text-gray-400 hidden sm:block" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                {user?.full_name || "Account"}
              </p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Icon name="user" size={15} />
              {lang === "fr" ? "Paramètres" : "Settings"}
            </Link>
            <button
              onClick={() => { setDropdownOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Icon name="logout" size={15} />
              {lang === "fr" ? "Se déconnecter" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
