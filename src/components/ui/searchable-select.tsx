import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface SearchableOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value?: string | null;
  onValueChange?: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Show the search input only when options.length > threshold (default 5) */
  searchThreshold?: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
  name?: string;
}

/** Normalize for case + accent insensitive matching (works for English; Bangla compares case-insensitively). */
function norm(s: string) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "নির্বাচন করুন",
      emptyText = "কোনো ফলাফল নেই",
      searchPlaceholder = "খুঁজুন...",
      searchThreshold = 5,
      disabled,
      loading,
      className,
      contentClassName,
      id,
      name,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const selected = React.useMemo(() => options.find((o) => o.value === value), [options, value]);
    const showSearch = options.length > searchThreshold;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            name={name}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            <span className="line-clamp-1 text-left">
              {loading ? "লোড হচ্ছে..." : selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("p-0 w-[--radix-popover-trigger-width] min-w-[200px]", contentClassName)}
          align="start"
        >
          <Command
            filter={(itemValue, search) => {
              if (!search) return 1;
              return norm(itemValue).includes(norm(search)) ? 1 : 0;
            }}
          >
            {showSearch && <CommandInput placeholder={searchPlaceholder} />}
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.hint || ""} ${opt.value}`}
                    disabled={opt.disabled}
                    onSelect={() => {
                      onValueChange?.(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
