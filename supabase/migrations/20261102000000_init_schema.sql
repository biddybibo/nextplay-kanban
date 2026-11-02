-- Kanban task board schema.
-- Every row is owned by a (possibly anonymous) Supabase Auth user, and RLS
-- restricts every table to rows where user_id = auth.uid().

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high')),
  due_date    date,
  -- Fractional ordering within a column: a card dropped between two others
  -- gets the midpoint, so a move only ever updates one row.
  position    double precision not null default 0,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tasks_user_status_position_idx on public.tasks (user_id, status, position);

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  color      text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index team_members_user_idx on public.team_members (user_id);

create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  color      text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.task_assignees (
  task_id    uuid not null references public.tasks (id) on delete cascade,
  member_id  uuid not null references public.team_members (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id)
);

create index task_assignees_member_idx on public.task_assignees (member_id);
create index task_assignees_user_idx on public.task_assignees (user_id);

create table public.task_labels (
  task_id    uuid not null references public.tasks (id) on delete cascade,
  label_id   uuid not null references public.labels (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

create index task_labels_label_idx on public.task_labels (label_id);
create index task_labels_user_idx on public.task_labels (user_id);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index comments_task_created_idx on public.comments (task_id, created_at);
create index comments_user_idx on public.comments (user_id);

-- Written only by triggers; clients can read but never write.
create table public.task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index task_activity_task_created_idx on public.task_activity (task_id, created_at);
create index task_activity_user_idx on public.task_activity (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tasks          enable row level security;
alter table public.team_members   enable row level security;
alter table public.labels         enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.task_activity  enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row.

create policy "own tasks" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own team members" on public.team_members
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own labels" on public.labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Join rows must also point at a task and member/label the user owns, so a
-- user can't attach their rows to someone else's task by guessing its id.
create policy "own task assignees" on public.task_assignees
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.team_members m where m.id = member_id and m.user_id = (select auth.uid()))
  );

create policy "own task labels" on public.task_labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.labels l where l.id = label_id and l.user_id = (select auth.uid()))
  );

create policy "own comments" on public.comments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );

create policy "read own activity" on public.task_activity
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Activity log. Runs as the table owner so it can write to task_activity,
-- which clients have no insert policy for.
create function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, type, payload, user_id)
    values (new.id, 'created', jsonb_build_object('status', new.status), new.user_id);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.task_activity (task_id, type, payload, user_id)
    values (new.id, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status), new.user_id);
  end if;

  if new.title is distinct from old.title then
    insert into public.task_activity (task_id, type, payload, user_id)
    values (new.id, 'title_changed', jsonb_build_object('from', old.title, 'to', new.title), new.user_id);
  end if;

  if new.priority is distinct from old.priority then
    insert into public.task_activity (task_id, type, payload, user_id)
    values (new.id, 'priority_changed', jsonb_build_object('from', old.priority, 'to', new.priority), new.user_id);
  end if;

  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (task_id, type, payload, user_id)
    values (new.id, 'due_date_changed', jsonb_build_object('from', old.due_date, 'to', new.due_date), new.user_id);
  end if;

  if new.description is distinct from old.description then
    insert into public.task_activity (task_id, type, payload, user_id)
    values (new.id, 'description_changed', '{}'::jsonb, new.user_id);
  end if;

  return new;
end;
$$;

create trigger tasks_log_activity
  after insert or update on public.tasks
  for each row execute function public.log_task_activity();

create function public.log_assignee_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec         record;
  member_name text;
begin
  rec := case when tg_op = 'INSERT' then new else old end;

  -- Skip rows removed by a cascade from a deleted task or member.
  select m.name into member_name from public.team_members m where m.id = rec.member_id;
  if member_name is null or not exists (select 1 from public.tasks t where t.id = rec.task_id) then
    return null;
  end if;

  insert into public.task_activity (task_id, type, payload, user_id)
  values (
    rec.task_id,
    case when tg_op = 'INSERT' then 'assignee_added' else 'assignee_removed' end,
    jsonb_build_object('member_id', rec.member_id, 'name', member_name),
    rec.user_id
  );
  return null;
end;
$$;

create trigger task_assignees_log_activity
  after insert or delete on public.task_assignees
  for each row execute function public.log_assignee_activity();

create function public.log_label_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec        record;
  label_name text;
begin
  rec := case when tg_op = 'INSERT' then new else old end;

  select l.name into label_name from public.labels l where l.id = rec.label_id;
  if label_name is null or not exists (select 1 from public.tasks t where t.id = rec.task_id) then
    return null;
  end if;

  insert into public.task_activity (task_id, type, payload, user_id)
  values (
    rec.task_id,
    case when tg_op = 'INSERT' then 'label_added' else 'label_removed' end,
    jsonb_build_object('label_id', rec.label_id, 'name', label_name),
    rec.user_id
  );
  return null;
end;
$$;

create trigger task_labels_log_activity
  after insert or delete on public.task_labels
  for each row execute function public.log_label_activity();

-- Trigger functions should never be callable through the API.
revoke execute on function public.set_updated_at()        from public, anon, authenticated;
revoke execute on function public.log_task_activity()     from public, anon, authenticated;
revoke execute on function public.log_assignee_activity() from public, anon, authenticated;
revoke execute on function public.log_label_activity()    from public, anon, authenticated;
