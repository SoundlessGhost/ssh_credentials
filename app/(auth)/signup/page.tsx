"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useSignup } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api/client";

const schema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signup.mutateAsync({ email: data.email, password: data.password });
      router.replace("/");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Email already registered"
          : err instanceof Error
            ? err.message
            : "Signup failed";
      toast.error(msg);
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Create account</h1>
        <p className="text-xs text-muted-foreground">
          14-day free trial — no card required.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Email</label>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[11px] text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Password</label>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[11px] text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Confirm password</label>
          <Input
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="text-[11px] text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={signup.isPending}>
          {signup.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-primary hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
