"use client";

import { useState } from "react";

/**
 * A blocking pop-up, for the few messages that must not be missed.
 *
 * The ordinary Flash banner sits above the form and is easy to scroll past.
 * This one covers the page until it is dismissed, which is what a buyer needs
 * when the thing they just typed cannot go ahead at all.
 *
 * Rendered from a query string, so a server action can raise it with a plain
 * redirect and nothing needs client-side state.
 */
export default function PopupMessage({
  title,
  body,
  actionLabel,
  actionHref,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="card w-full max-w-md text-center">
        <h2 className="h3 mb-2">{title}</h2>
        <p className="muted mb-6 text-sm">{body}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionHref && actionLabel && (
            <a className="btn-primary" href={actionHref}>
              {actionLabel}
            </a>
          )}
          <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
