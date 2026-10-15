#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function printUsage() {
  console.log(`Usage:
  node scripts/create-store.mjs --slug my-store --name "My Store" --email owner@example.com [--password "temp-pass"] [--theme-json '{"primaryColor":"#111827"}'] [--base-url http://localhost:3000]

Options:
  --slug          Store slug (required)
  --name          Store display name (required)
  --email         Store owner email (required)
  --password      Optional temporary password (generated if omitted)
  --theme-json    Initial theme config as JSON object (default: {})
  --base-url      Base app URL used in the handoff message (default: http://localhost:3000)
  --help          Show this help message
`);
}

function parseArgs(argv) {
  const options = {
    slug: "",
    name: "",
    email: "",
    password: "",
    themeJson: "{}",
    baseUrl: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--slug":
        options.slug = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--name":
        options.name = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--email":
        options.email = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--password":
        options.password = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--theme-json":
        options.themeJson = argv[index + 1] ?? "{}";
        index += 1;
        break;
      case "--base-url":
        options.baseUrl = argv[index + 1] ?? options.baseUrl;
        index += 1;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function validateOptions(options) {
  if (options.help) {
    return true;
  }

  if (!options.slug || !options.name || !options.email) {
    throw new Error("Missing required options. Provide --slug, --name, and --email.");
  }

  return true;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return { url, serviceRoleKey };
}

function parseThemeConfig(themeJson) {
  try {
    const parsed = JSON.parse(themeJson);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }

    throw new Error("Theme config must be a JSON object.");
  } catch (error) {
    throw new Error(`Invalid --theme-json value: ${String(error)}`);
  }
}

function generatePassword(length = 24) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .slice(0, length);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  validateOptions(options);
  const { url, serviceRoleKey } = getSupabaseConfig();
  const themeConfig = parseThemeConfig(options.themeJson);
  const temporaryPassword = options.password || generatePassword();

  const supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "public",
    },
  });

  const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email: options.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      role: "store_owner",
      created_via: "cli",
    },
    app_metadata: {
      role: "store_owner",
    },
  });

  if (createUserError || !userData?.user) {
    throw new Error(`Failed to create Supabase auth user: ${createUserError?.message ?? "Unknown error"}`);
  }

  try {
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        slug: options.slug,
        name: options.name,
        owner_id: userData.user.id,
        theme_config: themeConfig,
      })
      .select()
      .single();

    if (storeError || !storeData) {
      throw new Error(`Failed to create store record: ${storeError?.message ?? "Unknown error"}`);
    }

    console.log("Store created successfully.");
    console.log(`Store ID: ${storeData.id}`);
    console.log(`Store Slug: ${storeData.slug}`);
    console.log(`Store Name: ${storeData.name}`);
    console.log(`Owner ID: ${storeData.owner_id}`);
    console.log("\nClient handoff:");
    console.log(`Login URL: ${options.baseUrl}/login`);
    console.log(`Email: ${options.email}`);
    console.log(`Temporary password: ${temporaryPassword}`);
    console.log(`Store URL: https://${options.slug}.libaasonline.com`);
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
