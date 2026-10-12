-- SakhiBiz Supabase Database Schema & Row Level Security (RLS)
-- Migration: 20261012000000_init_sakhibiz.sql
-- Description: Core tables for profiles, enrollments, quiz attempts, expenses, and business plans

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if_not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'महिला उद्यमी',
  email text,
  language text not null default 'hi' check (language in ('hi', 'en')),
  business_category text not null default 'textiles_tailoring',
  business_stage text not null default 'starting' check (business_stage in ('idea', 'starting', 'growing', 'established')),
  location text default 'India',
  streak_days integer not null default 1 check (streak_days >= 0),
  completed_courses_count integer not null default 0 check (completed_courses_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ENROLLMENTS TABLE
create table if_not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  enrolled_at timestamptz not null default now(),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_lesson_ids jsonb not null default '[]'::jsonb,
  last_accessed_lesson_id text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint unique_user_course unique (user_id, course_id)
);

-- 3. QUIZ ATTEMPTS TABLE
create table if_not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  score_percent integer not null check (score_percent between 0 and 100),
  passed boolean not null default false,
  total_questions integer not null check (total_questions > 0),
  correct_count integer not null check (correct_count >= 0),
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. EXPENSES TABLE
create table if_not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  category text not null check (category in ('raw_materials', 'transport', 'packaging', 'utilities_rent', 'marketing', 'tools_equipment', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  payment_method text not null default 'upi' check (payment_method in ('cash', 'upi', 'bank_transfer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. BUSINESS PLANS TABLE
create table if_not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null default '',
  business_type text not null default 'textiles_tailoring',
  product_description text default '',
  target_customer text default '',
  estimated_startup_cost numeric(12, 2) not null default 0 check (estimated_startup_cost >= 0),
  monthly_sales_goal numeric(12, 2) not null default 0 check (monthly_sales_goal >= 0),
  marketing_plan text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- INDEXES for fast lookup by user
create index if_not exists idx_enrollments_user on public.enrollments(user_id);
create index if_not exists idx_quiz_attempts_user on public.quiz_attempts(user_id);
create index if_not exists idx_expenses_user on public.expenses(user_id);
create index if_not exists idx_business_plans_user on public.business_plans(user_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.expenses enable row level security;
alter table public.business_plans enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Enrollments policies
create policy "Users can view own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Users can insert own enrollments"
  on public.enrollments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own enrollments"
  on public.enrollments for update
  using (auth.uid() = user_id);

create policy "Users can delete own enrollments"
  on public.enrollments for delete
  using (auth.uid() = user_id);

-- Quiz attempts policies
create policy "Users can view own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

-- Expenses policies
create policy "Users can view own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on public.expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- Business plans policies
create policy "Users can view own business plans"
  on public.business_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own business plans"
  on public.business_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own business plans"
  on public.business_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own business plans"
  on public.business_plans for delete
  using (auth.uid() = user_id);

-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    display_name, 
    email, 
    language, 
    business_category, 
    business_stage, 
    location
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'महिला उद्यमी'),
    new.email,
    coalesce(new.raw_user_meta_data->>'language', 'hi'),
    coalesce(new.raw_user_meta_data->>'businessCategory', 'textiles_tailoring'),
    'starting',
    coalesce(new.raw_user_meta_data->>'location', 'India')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if already exists then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
