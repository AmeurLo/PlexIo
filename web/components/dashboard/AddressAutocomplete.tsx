"use client";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/dashboard/FormField";

interface AddressSuggestion {
  label: string;      // full formatted label shown in dropdown
  address: string;    // street line only (e.g. "45 Rue Chevalier")
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
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  return PROV_MAP[lower] ?? name.toUpperCase().slice(0, 2);
}

/** Ensure postal code is formatted as "A1A 1A1" */
function formatPostal(raw: string): string {
  const clean = raw.replace(/\s+/g, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return clean;
}

/** Extract a leading house number from the user's raw query (e.g. "45" from "45 rue X") */
function extractHouseNum(q: string): string {
  const m = q.trim().match(/^(\d+[-/]?\d*)\s+/);
  return m ? m[1] : "";
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
    onChange(val, "", "", "");
    if (timer.current) clearTimeout(timer.current);
    if (val.trim().length < 4) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  async function fetchSuggestions(q: string) {
    setLoading(true);
    try {
      const url = [
        "https://nominatim.openstreetmap.org/search",
        `?q=${encodeURIComponent(q)}`,
        "&countrycodes=ca",
        "&format=json",
        "&limit=8",
        "&addressdetails=1",
      ].join("");

      const res = await fetch(url, {
        headers: {
          "Accept-Language": "fr,en",
          "User-Agent": "Domely/1.0 (domely.ca)",
        },
      });
      const data: any[] = await res.json();

      // Preserve the house number the user typed (Nominatim rarely returns one for CA)
      const typedNum = extractHouseNum(q);

      const seen = new Set<string>();
      const mapped: AddressSuggestion[] = data
        .filter(item => item.address?.road) // must have a road
        .map(item => {
          const a = item.address;
          const apiNum   = a.house_number ?? "";
          const road     = a.road ?? a.pedestrian ?? a.footway ?? "";
          // Prefer the number the user typed; fall back to what the API returned
          const num      = apiNum || typedNum;
          const street   = [num, road].filter(Boolean).join(" ");
          const city     = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "";
          const province = toProvCode(a.state ?? "");
          const postal   = formatPostal(a.postcode ?? "");

          // Full label shown in dropdown: "45 Rue Chevalier, Montréal, QC H4K 1N5"
          const label = [
            street,
            city,
            [province, postal].filter(Boolean).join(" "),
          ].filter(Boolean).join(", ");

          return { label, address: street, city, province, postal_code: postal };
        })
        .filter(s => {
          if (!s.address) return false;
          if (seen.has(s.label)) return false;
          seen.add(s.label);
          return true;
        });

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
          placeholder={placeholder ?? "45 Rue Principale, Montréal"}
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
                {/* Street address line */}
                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                  {s.address}
                </p>
                {/* City · province · postal */}
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {[s.city, s.province, s.postal_code].filter(Boolean).join(" · ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
