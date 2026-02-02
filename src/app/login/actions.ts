"use server";

import { createClient } from "@/utils/supabase/server";
import { loginSchema } from "@/lib/schemas/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

type State = {
  success: boolean;
  message: string;
};

export async function loginAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  // 1. Validasi Input dengan Zod
  const data = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
    };
  }

  const { username, password } = parsed.data;
  const supabase = await createClient();

  // 2. Strategi Login: Username -> Fake Email
  // Supabase butuh email, tapi kasir taunya username.
  // Kita format jadi: username@pos.local
  const email = `${username}@example.com`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login Error:", error.message);
    return {
      success: false,
      message: "Username atau Password salah.",
    };
  }

  // 3. Redirect jika sukses
  // (Redirect akan melempar error NEXT_REDIRECT, jadi biarkan di luar try-catch atau biarkan throw)
  redirect("/");
}