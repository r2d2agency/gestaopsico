import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+55", country: "BR", flag: "🇧🇷", label: "Brasil" },
  { code: "+1", country: "US", flag: "🇺🇸", label: "EUA/Canadá" },
  { code: "+351", country: "PT", flag: "🇵🇹", label: "Portugal" },
  { code: "+353", country: "IE", flag: "🇮🇪", label: "Irlanda" },
  { code: "+44", country: "GB", flag: "🇬🇧", label: "Reino Unido" },
  { code: "+34", country: "ES", flag: "🇪🇸", label: "Espanha" },
  { code: "+33", country: "FR", flag: "🇫🇷", label: "França" },
  { code: "+49", country: "DE", flag: "🇩🇪", label: "Alemanha" },
  { code: "+39", country: "IT", flag: "🇮🇹", label: "Itália" },
  { code: "+81", country: "JP", flag: "🇯🇵", label: "Japão" },
  { code: "+86", country: "CN", flag: "🇨🇳", label: "China" },
  { code: "+91", country: "IN", flag: "🇮🇳", label: "Índia" },
  { code: "+52", country: "MX", flag: "🇲🇽", label: "México" },
  { code: "+54", country: "AR", flag: "🇦🇷", label: "Argentina" },
  { code: "+56", country: "CL", flag: "🇨🇱", label: "Chile" },
  { code: "+57", country: "CO", flag: "🇨🇴", label: "Colômbia" },
  { code: "+598", country: "UY", flag: "🇺🇾", label: "Uruguai" },
  { code: "+595", country: "PY", flag: "🇵🇾", label: "Paraguai" },
  { code: "+591", country: "BO", flag: "🇧🇴", label: "Bolívia" },
  { code: "+51", country: "PE", flag: "🇵🇪", label: "Peru" },
  { code: "+593", country: "EC", flag: "🇪🇨", label: "Equador" },
  { code: "+61", country: "AU", flag: "🇦🇺", label: "Austrália" },
  { code: "+972", country: "IL", flag: "🇮🇱", label: "Israel" },
  { code: "+27", country: "ZA", flag: "🇿🇦", label: "África do Sul" },
  { code: "+971", country: "AE", flag: "🇦🇪", label: "Emirados Árabes" },
  { code: "+82", country: "KR", flag: "🇰🇷", label: "Coreia do Sul" },
];

export function parsePhoneWithCode(fullPhone: string): { countryCode: string; number: string } {
  if (!fullPhone) return { countryCode: "+55", number: "" };
  const cleaned = fullPhone.replace(/\s/g, "");
  // Try to match known country codes (longest first)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.code)) {
      return { countryCode: c.code, number: cleaned.slice(c.code.length) };
    }
  }
  // If starts with + but no match, extract code
  if (cleaned.startsWith("+")) {
    const match = cleaned.match(/^(\+\d{1,4})(.*)/);
    if (match) return { countryCode: match[1], number: match[2] };
  }
  return { countryCode: "+55", number: fullPhone };
}

export function formatFullPhone(countryCode: string, number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  return `${countryCode}${digits}`;
}

interface PhoneInputInternationalProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
}

export function PhoneInputInternational({ value, onChange, placeholder }: PhoneInputInternationalProps) {
  const parsed = React.useMemo(() => parsePhoneWithCode(value), [value]);
  const [countryCode, setCountryCode] = React.useState(parsed.countryCode);
  const [localNumber, setLocalNumber] = React.useState(parsed.number);

  React.useEffect(() => {
    const p = parsePhoneWithCode(value);
    setCountryCode(p.countryCode);
    setLocalNumber(p.number);
  }, [value]);

  const handleCodeChange = (code: string) => {
    setCountryCode(code);
    onChange(formatFullPhone(code, localNumber));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d\s\-()]/g, "");
    setLocalNumber(digits);
    onChange(formatFullPhone(countryCode, digits));
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode);

  return (
    <div className="flex gap-1.5">
      <Select value={countryCode} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-[100px] shrink-0">
          <SelectValue>
            {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : countryCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {COUNTRY_CODES.map(c => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="text-xs text-muted-foreground">{c.code}</span>
                <span className="text-xs">{c.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder || "Número"}
        className="flex-1"
      />
    </div>
  );
}
