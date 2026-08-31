import Link from "next/link";
import { verifyCodeAction, resendCodeAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { one } from "@/lib/util";

export const metadata = { title: "Confirm your email", robots: { index: false } };

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const email = one(searchParams.email);

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Confirm your email</h1>
        <p className="muted mb-5">
          {email
            ? `Enter the 6-digit code we sent to ${email}.`
            : "Enter the 6-digit code we emailed you."}
        </p>
        <Flash searchParams={searchParams} />

        <form action={verifyCodeAction}>
          <input type="hidden" name="email" value={email} />
          <label className="field">
            <span>6-digit code</span>
            <input
              className="input text-center text-2xl font-bold tracking-[14px]"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
            />
            <small className="muted">The code expires 15 minutes after it is sent.</small>
          </label>
          <button className="btn-primary w-full" type="submit">
            Confirm and continue
          </button>
        </form>

        <form action={resendCodeAction} className="mt-3">
          <input type="hidden" name="email" value={email} />
          <button className="btn-ghost btn-sm w-full" type="submit">
            Send me a new code
          </button>
        </form>

        <p className="muted mt-4 text-sm">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <Link href="/login" className="text-wt-green">go back to sign in</Link>.
        </p>
      </div>
    </div>
  );
}
