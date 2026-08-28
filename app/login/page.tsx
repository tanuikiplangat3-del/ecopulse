import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export default function LoginPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Sign in</h1>
        <p className="muted mb-5">Welcome back to Ecopulse.</p>
        <Flash searchParams={searchParams} />
        <form action={loginAction}>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" name="password" required autoComplete="current-password" />
          </label>
          <button className="btn-primary w-full" type="submit">
            Sign in
          </button>
        </form>
        <p className="muted mt-4 text-sm">
          New here? <Link href="/register" className="text-wt-green">Create a buyer account</Link>
        </p>
        <p className="muted mt-1 text-sm">
          <Link href="/forgot-password" className="text-white/70 hover:text-white">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
