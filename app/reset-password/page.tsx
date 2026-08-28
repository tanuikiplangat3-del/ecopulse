import { resetAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { one } from "@/lib/util";

export default function ResetPasswordPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const token = one(searchParams.token);
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Choose a new password</h1>
        <Flash searchParams={searchParams} />
        <form action={resetAction}>
          <input type="hidden" name="token" value={token} />
          <label className="field">
            <span>New password</span>
            <input className="input" type="password" name="password" required minLength={8} autoComplete="new-password" />
            <small className="muted">At least 8 characters.</small>
          </label>
          <button className="btn-primary w-full" type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
}
