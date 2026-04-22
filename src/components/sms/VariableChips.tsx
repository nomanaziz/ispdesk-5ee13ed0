import { RefObject } from "react";
import { TEMPLATE_VARIABLES } from "@/lib/templateVars";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  label?: string;
}

/**
 * Click-to-insert variable chips. Inserts `{Variable}` at the textarea's
 * current cursor position and restores focus. If the textarea isn't focused,
 * appends to the end.
 */
export default function VariableChips({
  textareaRef,
  value,
  onChange,
  className,
  label = "ভেরিয়েবল (ক্লিক করে বসান):",
}: Props) {
  const insert = (variable: string) => {
    const token = `{${variable}}`;
    const ta = textareaRef.current;
    if (!ta) {
      onChange((value || "") + token);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // Restore focus + cursor after token
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      try {
        ta.setSelectionRange(pos, pos);
      } catch {
        /* noop */
      }
    });
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <Badge
            key={v}
            variant="outline"
            asChild
          >
            <button
              type="button"
              onClick={() => insert(v)}
              title={`ক্লিক করে বসান: {${v}}`}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {`{${v}}`}
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
