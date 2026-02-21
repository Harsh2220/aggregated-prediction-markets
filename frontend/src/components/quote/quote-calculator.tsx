"use client";

import { useState, useMemo } from "react";
import { useMarketData } from "@/hooks/use-market-data";
import { calculateQuote } from "@/utils/quote";
import { Input } from "@/components/ui/input";
import { QuoteResult } from "./quote-result";
import type { QuoteResult as QuoteResultType } from "@/types/market";

export function QuoteCalculator() {
  const { outcomeBook, selectedOutcome, setSelectedOutcome } = useMarketData();
  const [inputValue, setInputValue] = useState("");
  const dollarAmount = useMemo(() => {
    const cleaned = inputValue.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, [inputValue]);

  const quoteResult = useMemo<QuoteResultType | null>(() => {
    if (dollarAmount <= 0) return null;
    return calculateQuote(outcomeBook, dollarAmount, "buy");
  }, [dollarAmount, outcomeBook]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    setInputValue(raw);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Get a Quote
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSelectedOutcome("yes")}
          className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
            selectedOutcome === "yes"
              ? "bg-bid text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setSelectedOutcome("no")}
          className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
            selectedOutcome === "no"
              ? "bg-ask text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          No
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={inputValue}
          onChange={handleInputChange}
          className="pl-7 font-mono"
        />
      </div>

      {quoteResult ? (
        <QuoteResult quote={quoteResult} />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Enter an amount to see your quote
        </p>
      )}
    </div>
  );
}
