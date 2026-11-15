import { adminLogin } from "../../app/admin/actions";

export function AdminLoginForm({ error }: { error?: string }) {
  return (
    <section className="root-login__card" aria-labelledby="admin-login-title">
      <p className="root-login__card-label">Platform administration</p>
      <h2 id="admin-login-title">Admin sign in</h2>
      {error ? (
        <p role="alert" className="root-login__error">
          Email or password is incorrect.
        </p>
      ) : null}
      <form action={adminLogin} className="root-login__form">
        <label>
          Email
          <input required type="email" name="email" autoComplete="username" />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            name="password"
            autoComplete="current-password"
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </section>
  );
}
