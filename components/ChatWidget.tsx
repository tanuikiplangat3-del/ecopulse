"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormState, useFormStatus } from "react-dom";
import { sendChatAction, type ContactState } from "@/app/actions/contact";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" type="submit" disabled={pending}>
      {pending ? "Sending..." : "Send message"}
    </button>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [state, formAction] = useFormState<ContactState, FormData>(sendChatAction, {});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open]);

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat with us"
        className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-pill bg-wt-green px-5 py-3 text-[15px] font-bold uppercase tracking-[0.5px] text-white shadow-card transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1Zm3 5h10V7H7v2Zm0 4h7v-2H7v2Z" />
        </svg>
        Chat us
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-end p-4 sm:p-6"
          onMouseDown={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-sm overflow-hidden rounded-lg border border-wt-border bg-[#0b0f0d] shadow-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-bold text-white">Chat with us</p>
                <p className="text-xs text-white/50">We reply to seo@welcometomorrow.io</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-white/50 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-5">
              {state.ok ? (
                <div className="text-center">
                  <div className="mb-3 text-3xl">✅</div>
                  <p className="font-semibold text-white">Message sent</p>
                  <p className="muted mt-1 text-sm">Thanks - the Welcome Tomorrow SEO team will get back to you by email.</p>
                  <button className="btn-ghost btn-sm mt-4" type="button" onClick={() => setOpen(false)}>Close</button>
                </div>
              ) : (
                <form action={formAction} className="space-y-3">
                  {state.error && <div className="flash flash-error">{state.error}</div>}
                  <label className="field mb-0">
                    <span>Your name</span>
                    <input className="input" name="name" placeholder="Jane Doe" required />
                  </label>
                  <label className="field mb-0">
                    <span>Your email</span>
                    <input className="input" type="email" name="email" placeholder="you@company.com" required />
                  </label>
                  <label className="field mb-0">
                    <span>How can we help?</span>
                    <textarea className="textarea" name="message" placeholder="Tell us what you need..." required />
                  </label>
                  <SubmitButton />
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
