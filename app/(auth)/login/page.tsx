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

import { useLogin } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api/client";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data);
      router.replace("/");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 401
          ? "Invalid email or password"
          : err instanceof Error
            ? err.message
            : "Login failed";
      toast.error(msg);
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-xs text-muted-foreground">
          Access your saved servers + file manager.
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
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[11px] text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Need an account?{" "}
        <Link className="font-medium text-primary hover:underline" href="/signup">
          Create one
        </Link>
      </p>
    </div>
  );
}
