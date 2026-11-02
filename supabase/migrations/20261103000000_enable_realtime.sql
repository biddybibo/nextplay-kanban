-- Stream changes to clients so open tabs/devices stay in sync.
-- postgres_changes respects RLS, so each user only receives their own rows.
alter publication supabase_realtime
  add table public.tasks,
            public.task_assignees,
            public.task_labels,
            public.comments,
            public.task_activity,
            public.team_members,
            public.labels;
