"use client";

import { useActionState, useEffect, useRef } from "react";
import { loginAction } from "./actions";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Loader2, ArrowRight, ShieldCheck, User, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, {
    success: false,
    message: "",
  });

  const formRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // --- ANIMASI (Tetap dipertahankan untuk estetika) ---
  useGSAP(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      titleRef.current,
      { y: 50, opacity: 0, filter: "blur(10px)" },
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "power3.out",
      }
    ).fromTo(
      formRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
      "-=0.4"
    );
  });

  // Handle Error Shake
  useEffect(() => {
    if (state.message && !state.success) {
      toast.error(state.message);
      gsap.fromTo(
        formRef.current,
        { x: -10 },
        { x: 10, duration: 0.1, repeat: 3, yoyo: true }
      );
    }
  }, [state]);

  return (
    <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4 selection:bg-[#dfff4f] selection:text-black overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#dfff4f]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Header Logo */}
        <div ref={titleRef} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#dfff4f] rounded-2xl mb-6 shadow-[0_0_30px_rgba(223,255,79,0.3)]">
            <span className="text-3xl font-black text-black">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Smart POS v2
          </h1>
          <p className="text-zinc-400 text-sm">
            Silakan masuk untuk memulai shift.
          </p>
        </div>

        {/* Form Card */}
        <Card
          ref={formRef}
          className="w-full bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden"
        >
          <CardContent className="p-8">
            <form action={action} className="space-y-6">
              {/* Username Input */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Username ID
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#dfff4f] transition-colors size-4" />
                  <Input
                    name="username"
                    type="text"
                    placeholder="kasir01"
                    required
                    className="pl-10 bg-[#1c1d24] border-white/10 text-white focus-visible:ring-[#dfff4f] focus-visible:ring-offset-0 placeholder:text-zinc-600 h-12"
                  />
                  <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 size-4 opacity-50" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Passcode
                </Label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#dfff4f] transition-colors size-4" />
                  <Input
                    name="password"
                    type="password"
                    placeholder="•••••••"
                    required
                    className="pl-10 bg-[#1c1d24] border-white/10 text-white focus-visible:ring-[#dfff4f] focus-visible:ring-offset-0 placeholder:text-zinc-600 h-12 tracking-widest"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                disabled={isPending}
                type="submit"
                className="w-full bg-[#dfff4f] hover:bg-[#ccee44] text-black font-bold h-12 rounded-xl text-base transition-all active:scale-[0.98] group"
              >
                {isPending ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <>
                    <span className="relative z-10 mr-2">Buka Kasir</span>
                    <ArrowRight
                      size={18}
                      className="relative z-10 group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-zinc-600 text-xs mt-8">
          &copy; 2026 NexLanding POS System. Protected.
        </p>
      </div>
    </div>
  );
}