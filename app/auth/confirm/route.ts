import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

const ALLOWED_NEXT_PATHS = [
  "/onboarding/connect-mailbox",
  "/settings",
  "/inbox",
  "/knowledge-base",
];

function safeRedirectPath(next: string | null): string {
  const defaultPath = "/onboarding/connect-mailbox";
  if (!next) return defaultPath;
  // Only allow relative paths starting with / to prevent open redirect
  if (!next.startsWith("/") || next.startsWith("//")) return defaultPath;
  // Only allow known safe paths
  if (!ALLOWED_NEXT_PATHS.some((p) => next === p || next.startsWith(p + "/"))) {
    return defaultPath;
  }
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${encodeURIComponent(error?.message ?? "Unknown error")}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=${encodeURIComponent("No token hash or type")}`);
}
