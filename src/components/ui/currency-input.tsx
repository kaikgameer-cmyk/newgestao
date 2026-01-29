import * as React from "react";
import { cn } from "@/lib/utils";
import { roundCurrency } from "@/lib/format";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Value in decimal (e.g., 124.29), NOT cents */
  value: number | string;
  /** Callback with the parsed decimal value */
  onChange: (value: number) => void;
  /** Show R$ prefix inside the input */
  showPrefix?: boolean;
  /** Allow negative values */
  allowNegative?: boolean;
}

/**
 * Professional monetary input component with real-time masking
 * - Accepts only numbers
 * - Automatically formats with thousand separators (.) and decimal separator (,)
 * - User types: 12429 → Field shows: 124,29
 * - Opens numeric keyboard on mobile
 * - Value is always in decimal format (not cents)
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, showPrefix = true, allowNegative = false, placeholder = "0,00", ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Format number to display string (e.g., 1234.56 → "1.234,56")
    const formatForDisplay = (num: number): string => {
      if (num === 0) return "";
      
      const isNegative = num < 0;
      const absValue = Math.abs(num);
      const rounded = roundCurrency(absValue);
      
      const formatted = rounded.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      
      return isNegative ? `-${formatted}` : formatted;
    };

    // Parse display string to number
    const parseDisplayValue = (display: string): number => {
      if (!display) return 0;
      
      const isNegative = display.startsWith("-");
      // Remove everything except digits
      const digits = display.replace(/\D/g, "");
      
      if (!digits) return 0;
      
      // Convert to decimal (last 2 digits are decimals)
      const num = parseInt(digits, 10) / 100;
      
      return roundCurrency(isNegative ? -num : num);
    };

    // Sync display value when prop value changes
    React.useEffect(() => {
      const numValue = typeof value === "string" ? parseFloat(value) || 0 : value || 0;
      setDisplayValue(formatForDisplay(numValue));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Check for negative sign at the start
      const hasNegative = allowNegative && input.startsWith("-");
      
      // Remove all non-digits
      const digits = input.replace(/\D/g, "");
      
      if (!digits) {
        setDisplayValue(hasNegative ? "-" : "");
        onChange(0);
        return;
      }
      
      // Limit to reasonable amount (999,999,999.99)
      const limitedDigits = digits.slice(0, 11);
      
      // Parse as cents then convert to decimal
      const numericValue = parseInt(limitedDigits, 10) / 100;
      const finalValue = roundCurrency(hasNegative ? -numericValue : numericValue);
      
      // Format for display
      setDisplayValue(formatForDisplay(finalValue));
      onChange(finalValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrow keys
      if (
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.key === "Tab" ||
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        return;
      }
      
      // Allow minus sign at start if allowNegative
      if (allowNegative && e.key === "-" && (inputRef.current?.selectionStart === 0 || !displayValue)) {
        return;
      }
      
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) {
        return;
      }
      
      // Block non-numeric keys
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy editing
      e.target.select();
      props.onFocus?.(e);
    };

    return (
      <div className="relative">
        {showPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            R$
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          className={cn(
            "flex h-11 w-full rounded-lg border border-border bg-secondary/40 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-right",
            showPrefix ? "pl-10 pr-4" : "px-4",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
