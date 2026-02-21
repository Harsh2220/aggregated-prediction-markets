"use client";

import { useMarketSelector } from "@/hooks/use-market-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outcome } from "@/types/market";

const OPTIONS: { value: Outcome; label: string; color: string }[] = [
  { value: "yes", label: "Yes", color: "bg-bid" },
  { value: "no", label: "No", color: "bg-ask" },
];

export function OutcomeToggle() {
  const selectedOutcome = useMarketSelector((s) => s.selectedOutcome);
  const setSelectedOutcome = useMarketSelector((s) => s.setSelectedOutcome);

  const selected = OPTIONS.find((o) => o.value === selectedOutcome)!;

  return (
    <Select
      value={selectedOutcome}
      onValueChange={(v) => setSelectedOutcome(v as Outcome)}
    >
      <SelectTrigger className="w-24 h-8 text-xs">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${selected.color}`}
            />
            {selected.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${opt.color}`}
              />
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
