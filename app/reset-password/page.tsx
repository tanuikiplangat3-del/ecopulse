import { resetAction } from "@/app/actions/auth";
import { Flash } from "@/components/ui";
import { NewPasswordFields } from "@/components/PasswordField";
import { one } from "@/lib/util";

export default async function ResetPasswordPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const token = one(searchParams.token);
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="h2 mb-1">Choose a new password</h1>
        <Flash searchParams={searchParams} />
        <form action={resetAction}>
          <input type="hidden" name="token" value={token} />
          <NewPasswordFields label="New password" confirmLabel="Confirm new password" />
          <button className="btn-primary w-full" type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
}
