"use client";

import { useMarketSelector } from "@/hooks/use-market-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ViewMode } from "@/types/market";

const PROTOCOL_DOT_COLORS: Partial<Record<ViewMode, string>> = {
  polymarket: "#4D9FFF",
  dflow: "#FFB830",
};

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "combined", label: "All" },
  { value: "polymarket", label: "Polymarket" },
  { value: "dflow", label: "DFlow" },
];

export function ProtocolToggle() {
  const viewMode = useMarketSelector((s) => s.viewMode);
  const setViewMode = useMarketSelector((s) => s.setViewMode);

  const selected = OPTIONS.find((o) => o.value === viewMode)!;

  return (
    <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            {PROTOCOL_DOT_COLORS[selected.value] && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: PROTOCOL_DOT_COLORS[selected.value] }}
              />
            )}
            {selected.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            <span className="flex items-center gap-1.5">
              {PROTOCOL_DOT_COLORS[opt.value] && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: PROTOCOL_DOT_COLORS[opt.value] }}
                />
              )}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
