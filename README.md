# Wisery Cabinet (Next.js + Supabase + n8n)

Production-MVP кабинет клиента для B2B (салоны красоты / частные клиники).

- UI: русский
- Валюта: ₽ (`ru-RU`)
- Источник данных UI: **только Supabase**
- Бизнес-логика automation/billing/rating update: **n8n**
- Next.js server routes: только secure proxy к n8n

## Техстек
- Next.js 14 (App Router), TypeScript
- TailwindCSS
- shadcn/ui-style компоненты в `components/ui`
- Recharts
- supabase-js v2 + @supabase/ssr
- react-hook-form + zod
- xlsx

## Страницы
- `/login` — вход (email/телефон + пароль)
- `/dashboard` — главная KPI + рейтинг/отзывы
- `/analytics` — графики/таблицы KPI + услуги + экспорт XLS
- `/marketing` — ручные рассылки + результаты + авто-системы + статус интеграций
- `/billing` — подписка/статус/оплата/история платежей
- `/settings` — профиль и орг/филиалы (read-only)

## Быстрый старт
1. Скопировать env:
   ```bash
   cp .env.example .env.local
   ```
2. Вставить значения Supabase и n8n webhook URL.
3. Установить зависимости:
   ```bash
   npm install
   ```
4. Применить миграции в Supabase SQL Editor в порядке:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
5. Заполнить демо-данные:
   ```bash
   npm run seed
   ```
6. Запуск:
   ```bash
   npm run dev
   ```

## ENV переменные
См. `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_WEBHOOK_SECRET`
- `N8N_LAUNCH_CAMPAIGN_URL`
- `N8N_BILLING_CREATE_LINK_URL`
- `N8N_BILLING_SYNC_STATUS_URL`

## Supabase схема и особенность branch_id=null
В таблицах `kpi_daily` и `service_kpi_daily` `branch_id = null` означает **агрегат по всем филиалам**.

Чтобы не было дублей для org-wide строк, используется уникальный индекс:
- `unique (org_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'), day)`

Это позволяет хранить:
- отдельные строки по филиалам (`branch_id = конкретный uuid`)
- одну агрегированную строку по всем филиалам (`branch_id = null`)

## RLS
RLS включен на всех бизнес-таблицах.

Политика доступа: пользователь видит/меняет только свой `org_id` через `profiles`.

Используется helper функция:
- `public.current_org_id()` -> org текущего `auth.uid()`

Детали в `supabase/migrations/0002_rls.sql`.

## Логин email или телефон + пароль
Supabase auth из коробки работает по email/password.
Для phone login используется alias:
- телефон `+7 999 000-11-22` -> `79990001122@login.wisery.local`

На форме `/login`:
- если ввод похож на телефон -> нормализация RU -> alias email -> `signInWithPassword`
- если ввод email -> обычный `signInWithPassword`

Функции:
- `lib/auth/phone.ts`

## n8n proxy контракты
### POST `/api/n8n/campaign/launch`
Body:
```json
{ "campaign_id": "uuid", "org_id": "uuid", "branch_id": "uuid|null" }
```
Проксирует в `N8N_LAUNCH_CAMPAIGN_URL` с header:
- `x-wisery-secret: N8N_WEBHOOK_SECRET`

### POST `/api/n8n/billing/create-link`
Body:
```json
{
  "org_id": "uuid",
  "amount": 5900,
  "description": "Оплата подписки Wisery",
  "success_url": "https://...",
  "fail_url": "https://..."
}
```
Проксирует в `N8N_BILLING_CREATE_LINK_URL`.
Ожидает ответ n8n:
```json
{ "payment_url": "https://...", "operation_id": "..." }
```
После ответа route обновляет:
- `subscriptions.last_payment_url`
- `subscriptions.last_payment_operation_id`
- создает `payments` со `status='created'`

### POST `/api/n8n/billing/sync-status`
Body:
```json
{ "org_id": "uuid", "operation_id": "..." }
```
Проксирует в `N8N_BILLING_SYNC_STATUS_URL`.

## Точка API ссылки для интегратора n8n
- [Платёжные ссылки — описание](https://developers.tochka.com/docs/tochka-api/opisanie-metodov/platyozhnye-ssylki)
- [Create Payment Operation](https://developers.tochka.com/docs/tochka-api/api/create-payment-operation-acquiring-v-1-0-payments-post)
- [Вебхуки](https://developers.tochka.com/docs/tochka-api/opisanie-metodov/vebhuki)

## Seed данные
Скрипт `scripts/seed.ts` создаёт:
- org: `Демо салон`
- 2 филиала
- demo user email: `owner@demo.ru` / `Demo12345!`
- demo user phone alias: `79990001122@login.wisery.local` / `Demo12345!`
- `kpi_daily`, `service_kpi_daily`, `reviews_daily` за 30 дней
- 2 кампании + `campaign_runs`
- `automation_runs` для `no_answer_call` и `inactive_50_days`
- подписку и историю платежей

## Acceptance check (manual)
- `npm install && npm run dev` стартует без ошибок.
- Логин работает по email и по телефону.
- Без логина `/dashboard` и `/api/n8n/*` недоступны.
- Переключение филиала меняет KPI/аналитику.
- Создание кампании вызывает `/api/n8n/campaign/launch`.
- Кнопка «Оплатить» вызывает `/api/n8n/billing/create-link` и открывает `payment_url`.
- Экспорт XLS скачивает `wisery_export_{org}_{branch}_{period}_{date}.xlsx`.

## Дополнительно: CRM-таблицы
Добавлены новые таблицы для клиентской базы, диалогов и записей:
- `clients` — единая база клиентов, включая `tags` (каналы/источник)
- `client_channels` — профили клиента в разных каналах (tg/wa/max/yc)
- `appointments` — каждая запись отдельно
- `conversations` — диалоги
- `messages` — сообщения внутри диалогов
- `services` — справочник услуг
- `masters` — справочник мастеров

SQL:
- `supabase/migrations/0003_crm.sql`
- `supabase/migrations/0004_rls_crm.sql`
# plarfomatestagent
