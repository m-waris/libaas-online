"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  isAdminAuthenticated,
  signInAdmin,
  signOutAdmin,
} from "../../lib/admin-auth";
import { createAdminClient } from "../../lib/supabase/admin";

export async function adminLogin(formData: FormData) {
  const ok = await signInAdmin(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (!ok) redirect("/login?error=admin");
  redirect("/dashboard");
}

export async function adminLogout() {
  await signOutAdmin();
  redirect("/login");
}

export async function createStore(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/login");
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ||
    slug.length < 2 ||
    !name ||
    !email ||
    password.length < 8
  ) {
    redirect("/dashboard/stores?error=invalid");
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "store_owner", created_via: "admin" },
    app_metadata: { role: "store_owner" },
  });
  if (error || !data.user) redirect("/dashboard/stores?error=owner");
  const { error: storeError } = await admin
    .from("stores")
    .insert({ slug, name, owner_id: data.user.id });
  if (storeError) {
    await admin.auth.admin.deleteUser(data.user.id);
    redirect("/dashboard/stores?error=store");
  }
  revalidatePath("/dashboard/stores");
  redirect("/dashboard/stores?created=1");
}

export async function updateStore(formData: FormData) {
  if (!(await isAdminAuthenticated())) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const active = String(formData.get("is_active")) === "true";
  if (
    !id ||
    !name ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ||
    slug.length < 2
  )
    redirect("/dashboard/stores?error=invalid");
  const admin = createAdminClient();
  const { error } = await admin
    .from("stores")
    .update({ slug, name, is_active: active })
    .eq("id", id);
  if (error) redirect("/dashboard/stores?error=store");
  revalidatePath("/dashboard/stores");
  redirect("/dashboard/stores?updated=1");
}
