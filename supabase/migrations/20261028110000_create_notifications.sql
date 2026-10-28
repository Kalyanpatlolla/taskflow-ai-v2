create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  type text not null check (
    type in ('due_tomorrow', 'due_today', 'overdue', 'task_completed')
  ),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  event_key text not null unique
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications"
  on public.notifications;
create policy "Users can read their notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can update their notifications"
  on public.notifications;
create policy "Users can update their notifications"
  on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

create or replace function public.generate_due_task_notifications()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  authenticated_user_id uuid := auth.uid();
  inserted_count integer;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.notifications (user_id, task_id, type, content, event_key)
  select
    task.owner_id,
    task.id,
    due_event.type,
    due_event.content,
    due_event.event_key
  from public.tasks as task
  cross join lateral (
    values
      (
        'due_tomorrow'::text,
        format('%s is due tomorrow.', task.title),
        format('task:%s:due_tomorrow:%s', task.id, task.due_date)
      ),
      (
        'due_today'::text,
        format('%s is due today.', task.title),
        format('task:%s:due_today:%s', task.id, task.due_date)
      ),
      (
        'overdue'::text,
        format('%s is overdue.', task.title),
        format('task:%s:overdue:%s', task.id, task.due_date)
      )
  ) as due_event(type, content, event_key)
  where task.owner_id = authenticated_user_id
    and task.status <> 'done'
    and task.due_date is not null
    and (
      (due_event.type = 'due_tomorrow' and task.due_date = current_date + 1)
      or (due_event.type = 'due_today' and task.due_date = current_date)
      or (due_event.type = 'overdue' and task.due_date < current_date)
    )
  on conflict (event_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.generate_due_task_notifications() from public, anon;
grant execute on function public.generate_due_task_notifications() to authenticated;

create or replace function public.notify_task_completed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'done'
    and old.status is distinct from new.status
    and auth.uid() is not null
    and auth.uid() = new.owner_id
  then
    insert into public.notifications (user_id, task_id, type, content, event_key)
    values (
      new.owner_id,
      new.id,
      'task_completed',
      format('%s was completed.', new.title),
      format('task:%s:completed:%s', new.id, gen_random_uuid())
    )
    on conflict (event_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_task_completed() from public, anon, authenticated;

drop trigger if exists notify_task_completed on public.tasks;
create trigger notify_task_completed
after update of status on public.tasks
for each row
execute function public.notify_task_completed();

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
