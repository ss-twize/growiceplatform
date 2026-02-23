"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePollingQuery } from "@/lib/hooks/use-polling-query";
import { fetchSettingsData } from "@/lib/queries/settings";

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const loader = useCallback(async () => fetchSettingsData(supabase), [supabase]);
  const { data, loading, error } = usePollingQuery(loader, { intervalMs: 30000, enabled: true });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [primaryBranchId, setPrimaryBranchId] = useState<string | null>(null);
  const [showBranchNotice, setShowBranchNotice] = useState(false);

  useEffect(() => {
    if (!data || initialized) return;
    setOrgName(data.org?.name || "");
    setFullName(data.profile?.full_name || "");
    setPhone(data.profile?.phone || "");
    const primaryBranch = data.branches[0];
    setPrimaryBranchId(primaryBranch?.id ?? null);
    setBranchAddress(primaryBranch?.address ?? "");
    setInitialized(true);
  }, [data, initialized]);

  if (loading) {
    return <div className="text-sm text-muted">Загрузка настроек...</div>;
  }

  if (error || !data) {
    return <Alert className="border-danger/50"><AlertTitle>Ошибка</AlertTitle><AlertDescription>{error || "Нет данных"}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Настройки" description="Профиль, организация и филиалы" />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Профиль</CardTitle>
            <Button
              variant="outline"
              disabled={savingProfile}
              onClick={async () => {
                if (!data.profile?.org_id) return;
                setSavingProfile(true);
                const { error: updateError } = await supabase
                  .from("profiles")
                  .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
                  .eq("user_id", data.profile.user_id);
                setSavingProfile(false);
                if (updateError) {
                  alert(updateError.message);
                }
              }}
            >
              {savingProfile ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="space-y-2">
            <p className="text-xs text-muted">ФИО</p>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">Телефон</p>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-xs text-muted">Роль</p>
            <p>{data.profile?.role === "owner" ? "Владелец" : data.profile?.role === "admin" ? "Администратор" : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>Организация</CardTitle>
              <Button variant="outline" onClick={() => setShowBranchNotice(true)}>Добавить филиал</Button>
            </div>
            <Button
              variant="outline"
              disabled={savingOrg || !orgName.trim()}
              onClick={async () => {
                if (!data.org?.id) return;
                setSavingOrg(true);
                const updates = [
                  supabase.from("orgs").update({ name: orgName.trim() }).eq("id", data.org.id)
                ];
                if (primaryBranchId) {
                  updates.push(
                    supabase
                      .from("branches")
                      .update({ address: branchAddress.trim() || null })
                      .eq("id", primaryBranchId)
                  );
                }
                const results = await Promise.all(updates);
                setSavingOrg(false);
                const failed = results.find((res) => res.error);
                if (failed?.error) {
                  alert(failed.error.message);
                }
              }}
            >
              {savingOrg ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
          {showBranchNotice ? <p className="text-xs text-muted">Функция в разработке</p> : null}
        </CardHeader>
        <CardContent className="grid gap-6 text-sm lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-xs text-muted">Название</p>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="max-w-[360px]"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
              />
              <Input
                className="max-w-[360px]"
                placeholder="Адрес"
                value={branchAddress}
                onChange={(event) => setBranchAddress(event.target.value)}
              />
            </div>
            <div className="space-y-2 pt-3">
              <p className="text-xs text-muted">Страница на картах</p>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Ссылка (Яндекс Карты)" />
                <Input placeholder="Ссылка (2Гис)" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-muted">Администраторы</p>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Input placeholder="Введите ФИО" />
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Введите ФИО" />
              </div>
              <div className="flex items-center gap-2">
                <Input placeholder="Введите ФИО" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
