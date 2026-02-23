"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildPhoneAliasEmail, isPhoneIdentifier } from "@/lib/auth/phone";

const loginSchema = z.object({
  identifier: z.string().min(3, "Введите email или телефон"),
  password: z.string().min(8, "Минимум 8 символов")
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  async function onSubmit(values: LoginValues) {
    setLoading(true);
    setErrorMessage(null);
    const supabase = createSupabaseBrowserClient();

    try {
      const identifier = values.identifier.trim();
      const email = isPhoneIdentifier(identifier) ? buildPhoneAliasEmail(identifier) : identifier.toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password
      });

      if (error) {
        throw new Error(error.message);
      }

      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка авторизации";
      setErrorMessage(message === "Failed to fetch" ? "Не удается подключиться к Supabase. Проверьте NEXT_PUBLIC_SUPABASE_URL и ключи в .env.local." : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-[#00E378]">GROWICE</CardTitle>
          <CardDescription>ИИ работает. Вы – управляете</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email или телефон</Label>
              <Input id="identifier" placeholder="owner@demo.ru или +7 999 000-11-22" {...form.register("identifier")} />
              <p className="text-xs text-danger">{form.formState.errors.identifier?.message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" placeholder="••••••••" {...form.register("password")} />
              <p className="text-xs text-danger">{form.formState.errors.password?.message}</p>
            </div>

            {errorMessage ? <p className="rounded-md border border-danger/40 bg-danger/10 p-2 text-sm text-danger">{errorMessage}</p> : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Входим..." : "Войти"}
            </Button>
          </form>

          <div className="mt-4 rounded-md border border-border bg-black p-3 text-xs text-muted">
            <p>Демо login:</p>
            <p>email: owner@demo.ru / пароль: Demo12345!</p>
            <p>телефон: +7 999 000-11-22 / пароль: Demo12345!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
