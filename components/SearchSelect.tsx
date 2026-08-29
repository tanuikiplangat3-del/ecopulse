"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  name: string;
  options: string[];
  placeholder?: string;
  defaultValue?: string;
  /** Text shown as the modal heading, e.g. "Choose a country". */
  title?: string;
  /** How many rows are visible before the list scrolls (default 5). */
  visible?: number;
  /** If false, "Any" (clear) is not offered - use for required pickers. */
  allowAny?: boolean;
};

/**
 * A searchable picker. The trigger opens a small modal popup with a type-to-search
 * box and a scrollable list: roughly the first few options are visible, the rest
 * appear as you scroll or once you start typing. Submits its value via a hidden
 * input so it works inside a plain <form method="get">.
 */
export default function SearchSelect({
  name,
  options,
  placeholder = "Any",
  defaultValue = "",
  title,
  visible = 5,
  allowAny = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(defaultValue);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Prevent the page from scrolling behind the open popup.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      // focus the search box when the popup opens
      setTimeout(() => inputRef.current?.focus(), 30);
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
  };

  // ~44px per row
  const listMaxHeight = visible * 44;

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="select flex w-full items-center justify-between text-left"
      >
        <span className={value ? "text-white" : "text-white/40"}>{value || placeholder}</span>
        <span className="text-white/50">▾</span>
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[12vh]"
          onMouseDown={() => setOpen(false)}
        >
          {/* backdrop - translucent: the page shows through, dimmed and blurred,
              but can't be scrolled or clicked until a choice is made */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* popup */}
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-lg border border-wt-border bg-[#0b0f0d] shadow-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white">{title || "Choose an option"}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="input mb-2"
              />

              <div className="overflow-auto" style={{ maxHeight: listMaxHeight }}>
                {allowAny && (
                  <button
                    type="button"
                    onClick={() => pick("")}
                    className="block w-full rounded-md px-3 py-2.5 text-left text-sm text-white/60 hover:bg-white/10"
                  >
                    {placeholder}
                  </button>
                )}
                {filtered.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => pick(o)}
                    className={
                      "block w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-wt-green/20 " +
                      (o === value ? "bg-wt-green/15 text-wt-green" : "text-white")
                    }
                  >
                    {o}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-white/40">No matches</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
