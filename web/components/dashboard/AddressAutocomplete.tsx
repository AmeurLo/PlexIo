"use client";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/dashboard/FormField";

interface AddressSuggestion {
  display: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
}

interface Props {
  value: string;
  onChange: (address: string, city: string, province: string, postal_code: string) => void;
  placeholder?: string;
}

// Province name → 2-letter code
const PROV_MAP: Record<string, string> = {
  "québec": "QC", "quebec": "QC",
  "ontario": "ON",
  "british columbia": "BC", "colombie-britannique": "BC",
  "alberta": "AB",
  "manitoba": "MB",
  "saskatchewan": "SK",
  "nova scotia": "NS", "nouvelle-écosse": "NS",
  "new brunswick": "NB", "nouveau-brunswick": "NB",
  "newfoundland and labrador": "NL", "terre-neuve-et-labrador": "NL",
  "prince edward island": "PE", "île-du-prince-édouard": "PE",
  "northwest territories": "NT", "territoires du nord-ouest": "NT",
  "yukon": "YT",
  "nunavut": "NU",
};

function toProvCode(name: string): string {
  if (!name) return "QC";
  const key = name.toLowerCase().trim();
  return PROV_MAP[key] ?? name.toUpperCase().slice(0, 2);
}

export default function AddressAutocomplete({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. when editing resets form)
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    onChange(val, "", "", ""); // pass raw text up while typing
    if (timer.current) clearTimeout(timer.current);
    if (val.trim().length < 4) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  async function fetchSuggestions(q: string) {
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=ca&format=json&limit=6&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "fr,en" } });
      const data = await res.json();
      const mapped: AddressSuggestion[] = data
        .filter((item: any) => item.address)
        .map((item: any) => {
          const a = item.address;
          const houseNumber = a.house_number ?? "";
          const road = a.road ?? a.pedestrian ?? a.footway ?? "";
          const streetLine = [houseNumber, road].filter(Boolean).join(" ");
          const city = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
          const province = toProvCode(a.state ?? "");
          const postal = (a.postcode ?? "").replace(/\s/g, " ").toUpperCase();
          return {
            display: item.display_name,
            address: streetLine,
            city,
            province,
            postal_code: postal,
          };
        })
        .filter((s: AddressSuggestion) => s.address);
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function select(s: AddressSuggestion) {
    setQuery(s.address);
    setSuggestions([]);
    setOpen(false);
    onChange(s.address, s.city, s.province, s.postal_code);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          className={inputClass}
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder ?? "123 rue Principale"}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => select(s)}
                className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{s.address}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {[s.city, s.province, s.postal_code].filter(Boolean).join(", ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
