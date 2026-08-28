import { forgotAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";

export default function ForgotPasswordPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Reset your password</h1>
        <p className="muted mb-5">Enter your email and we&apos;ll send you a reset link.</p>
        <Flash searchParams={searchParams} />
        <form action={forgotAction}>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" required autoComplete="email" />
          </label>
          <button className="btn-primary w-full" type="submit">Send reset link</button>
        </form>
      </div>
    </div>
  );
}
