import { adminLogin } from "../../app/admin/actions";

export function AdminLoginForm({ error }: { error?: string }) {
  return <main className="owner-login"><div className="owner-login__card">
    <p className="owner-login__eyebrow">Libaas Online administration</p><h1 className="font-serif text-3xl font-semibold">Admin sign in</h1>
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Email or password is incorrect.</p> : null}
    <form action={adminLogin} className="space-y-4">
      <label className="block text-sm font-medium">Email<input required type="email" name="email" autoComplete="username" className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2" /></label>
      <label className="block text-sm font-medium">Password<input required type="password" name="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2" /></label>
      <button className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">Sign in</button>
    </form>
  </div></main>;
}
