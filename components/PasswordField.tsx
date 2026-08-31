"use client";

import { useState } from "react";
import { PASSWORD_RULES, PASSWORD_PATTERN } from "@/lib/password";

/* Eye icons - inline SVG so no icon library is needed. */
function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Stop manual copy/paste while leaving password-manager autofill untouched. */
const noPaste = {
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onDrop: (e: React.DragEvent<HTMLInputElement>) => e.preventDefault(),
  onCopy: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
};

function Eye({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-label={shown ? "Hide password" : "Show password"}
      title={shown ? "Hide password" : "Show password"}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
    >
      <EyeIcon off={shown} />
    </button>
  );
}

/**
 * Single password box with a show/hide eye. Used on sign-in, where no strength
 * rules are applied (existing accounts must still be able to get in).
 */
export function PasswordInput({
  name = "password",
  label = "Password",
  autoComplete = "current-password",
}: {
  name?: string;
  label?: string;
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="relative">
        <input
          className="input pr-11"
          type={shown ? "text" : "password"}
          name={name}
          required
          autoComplete={autoComplete}
          {...noPaste}
        />
        <Eye shown={shown} onClick={() => setShown((s) => !s)} />
      </div>
    </label>
  );
}

/**
 * New-password + confirm-password pair with an eye on each box, a live rule
 * checklist, and pasting disabled. Password managers still autofill normally.
 */
export function NewPasswordFields({
  label = "Choose a password",
  confirmLabel = "Confirm password",
}: {
  label?: string;
  confirmLabel?: string;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const mismatch = confirm.length > 0 && pw !== confirm;

  return (
    <>
      <label className="field">
        <span>{label}</span>
        <div className="relative">
          <input
            className="input pr-11"
            type={showPw ? "text" : "password"}
            name="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            minLength={8}
            pattern={PASSWORD_PATTERN}
            title="At least 8 characters, with a capital letter, a small letter, a number and a special character."
            autoComplete="new-password"
            {...noPaste}
          />
          <Eye shown={showPw} onClick={() => setShowPw((s) => !s)} />
        </div>

        <ul className="mt-2 grid gap-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(pw);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-2 text-xs ${met ? "text-wt-green" : "text-white/50"}`}
              >
                <span aria-hidden="true">{met ? "✓" : "○"}</span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </label>

      <label className="field">
        <span>{confirmLabel}</span>
        <div className="relative">
          <input
            className="input pr-11"
            type={showConfirm ? "text" : "password"}
            name="confirmPassword"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            {...noPaste}
          />
          <Eye shown={showConfirm} onClick={() => setShowConfirm((s) => !s)} />
        </div>
        {mismatch && <small className="mt-1 block text-xs text-red-300">Both passwords must match.</small>}
      </label>

      <p className="muted -mt-1 mb-4 text-xs">
        For your security, passwords must be typed rather than pasted. Saved passwords from
        your browser or a manager like Dashlane still fill in automatically.
      </p>
    </>
  );
}
