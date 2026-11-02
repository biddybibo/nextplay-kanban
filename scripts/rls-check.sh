#!/bin/bash
# Two anonymous guests (A, B) hit the live REST API; B tries to read/modify A's data.
set -a; source "$(dirname "$0")/../.env.local"; set +a
URL=$VITE_SUPABASE_URL
KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
H=(-H "apikey: $KEY" -H "Content-Type: application/json")
token() { curl -s "${H[@]}" -X POST "$URL/auth/v1/signup" -d '{}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["access_token"], d["user"]["id"])'; }
api() { local tok=$1; shift; curl -s "${H[@]}" -H "Authorization: Bearer $tok" -H "Prefer: return=representation" "$@"; echo; }

read TA UA < <(token); read TB UB < <(token)
echo "A=$UA"; echo "B=$UB"
TASK=$(api $TA -X POST "$URL/rest/v1/tasks" -d '{"title":"A secret task"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
MEM=$(api $TA -X POST "$URL/rest/v1/team_members" -d '{"name":"Alice"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
api $TA -X POST "$URL/rest/v1/task_assignees" -d "{\"task_id\":\"$TASK\",\"member_id\":\"$MEM\"}" >/dev/null
api $TA -X PATCH "$URL/rest/v1/tasks?id=eq.$TASK" -d '{"status":"in_progress","priority":"high"}' >/dev/null
api $TB -X POST "$URL/rest/v1/tasks" -d '{"title":"B task"}' >/dev/null

echo "== B lists tasks:";                 api $TB "$URL/rest/v1/tasks?select=title"
echo "== B patches A's task:";            api $TB -X PATCH "$URL/rest/v1/tasks?id=eq.$TASK" -d '{"title":"hacked"}'
echo "== B deletes A's task:";            api $TB -X DELETE "$URL/rest/v1/tasks?id=eq.$TASK"
echo "== B inserts with user_id=A:";      api $TB -X POST "$URL/rest/v1/tasks" -d "{\"title\":\"spoof\",\"user_id\":\"$UA\"}"
echo "== B comments on A's task:";        api $TB -X POST "$URL/rest/v1/comments" -d "{\"task_id\":\"$TASK\",\"body\":\"hi\"}"
echo "== B reads A's activity:";          api $TB "$URL/rest/v1/task_activity?task_id=eq.$TASK"
echo "== B writes activity directly:";    api $TB -X POST "$URL/rest/v1/task_activity" -d "{\"task_id\":\"$TASK\",\"type\":\"x\",\"user_id\":\"$UB\"}"
echo "== Unauthenticated (anon key only):"; curl -s "${H[@]}" "$URL/rest/v1/tasks?select=title"; echo
echo "== A lists tasks:";                 api $TA "$URL/rest/v1/tasks?select=title,status,priority"
echo "== A activity log:";                api $TA "$URL/rest/v1/task_activity?task_id=eq.$TASK&select=type,payload&order=created_at"
echo "== A deletes own task (cleanup):";  api $TA -X DELETE "$URL/rest/v1/tasks?id=eq.$TASK&select=title"
