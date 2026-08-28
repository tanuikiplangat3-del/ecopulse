"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  options: string[];
  coreCount?: number;
  placeholder?: string;
  selectableAll?: boolean;
  defaultValue?: string;
};

/**
 * A selector that surfaces the first few options as clickable, and rolls the
 * rest into a translucent layer that fades away, as if surfacing from underground.
 * When selectableAll is false, the underground options are decorative only.
 */
export default function UndergroundSelect({
  name,
  options,
  coreCount = 5,
  placeholder = "Any",
  selectableAll = false,
  defaultValue = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const top = options.slice(0, coreCount);
  const rest = options.slice(coreCount);
  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="select flex w-full items-center justify-between text-left"
      >
        <span className={value ? "text-white" : "text-white/40"}>{value || placeholder}</span>
        <span className="text-white/50">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-wt-border bg-black/95 shadow-card backdrop-blur">
          <button
            type="button"
            onClick={() => pick("")}
            className="block w-full px-4 py-2 text-left text-sm text-white/60 hover:bg-white/10"
          >
            {placeholder}
          </button>

          <div className="max-h-56 overflow-auto">
            {top.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-wt-green/20"
              >
                {o}
              </button>
            ))}
          </div>

          {rest.length > 0 && (
            <div className="relative border-t border-white/5">
              <div
                className={
                  "relative max-h-44 overflow-hidden px-4 py-2 " +
                  (selectableAll ? "" : "pointer-events-none select-none")
                }
                style={{
                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 92%)",
                  WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 92%)",
                }}
              >
                {rest.map((o, i) =>
                  selectableAll ? (
                    <button
                      key={o}
                      type="button"
                      onClick={() => pick(o)}
                      className="block w-full py-1 text-left text-sm text-white/55 transition-colors hover:text-white"
                    >
                      {o}
                    </button>
                  ) : (
                    <div
                      key={o}
                      className="py-1 text-sm text-white/35"
                      style={{ filter: `blur(${Math.min(i * 0.12, 1.1)}px)` }}
                    >
                      {o}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
