import { adminLogin } from "../../app/admin/actions";
import { ArrowRight, CircleAlert, LockKeyhole, Mail } from "lucide-react";
import { AppIcon } from "../ui/app-icon";

export function AdminLoginForm({ error }: { error?: string }) {
  return (
    <section className="root-login__card" aria-labelledby="admin-login-title">
      <p className="root-login__card-label">Platform administration</p>
      <h2 id="admin-login-title">Admin sign in</h2>
      {error ? (
        <p
          role="alert"
          className="root-login__error inline-flex items-center gap-2"
        >
          <AppIcon icon={CircleAlert} size={18} />
          Email or password is incorrect.
        </p>
      ) : null}
      <form action={adminLogin} className="root-login__form">
        <label>
          <span className="inline-flex items-center gap-2">
            <AppIcon icon={Mail} size={16} />
            Email
          </span>
          <input required type="email" name="email" autoComplete="username" />
        </label>
        <label>
          <span className="inline-flex items-center gap-2">
            <AppIcon icon={LockKeyhole} size={16} />
            Password
          </span>
          <input
            required
            type="password"
            name="password"
            autoComplete="current-password"
          />
        </label>
        <button type="submit">
          Sign in <AppIcon icon={ArrowRight} size={17} />
        </button>
      </form>
    </section>
  );
}
