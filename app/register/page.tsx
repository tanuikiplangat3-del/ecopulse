import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export default function RegisterPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Create your account</h1>
        <p className="muted mb-5">Sign up as a buyer to purchase link placements.</p>
        <Flash searchParams={searchParams} />
        <form action={registerAction}>
          <label className="field">
            <span>Name</span>
            <input className="input" name="name" required autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
            <small className="muted">At least 8 characters.</small>
          </label>
          <button className="btn-primary w-full" type="submit">
            Create account
          </button>
        </form>
        <div className="mt-5 rounded-md border border-wt-border bg-white/5 p-3 text-xs text-white/60">
          Want to list your sites as a <strong className="text-white/80">publisher</strong>? Publishing is
          invite-only, so ask an admin to send you an invite.
        </div>
        <p className="muted mt-4 text-sm">
          Already have an account? <Link href="/login" className="text-wt-green">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
