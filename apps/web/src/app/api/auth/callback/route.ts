import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import type { Database } from "@seocraft/supabase/db/database.types";
import { BASE_URL } from "@/lib/constants";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  console.log("CODE", code);

  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }
  const redirect = Boolean(requestUrl.searchParams.get("redirect"));

  if (!redirect) {
    return NextResponse.redirect(`${BASE_URL}/dashboard`);
  }
  return NextResponse.redirect(`${BASE_URL}/you-can-close-this-now`);

  // URL to redirect to after sign in process completes
}
