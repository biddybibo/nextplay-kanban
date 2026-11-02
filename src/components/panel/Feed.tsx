import { useState, type KeyboardEvent } from 'react'
import { differenceInSeconds, format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { ArrowUp, Trash2 } from 'lucide-react'
import { describeActivity } from '../../lib/activity'
import {
  useActivity,
  useAddComment,
  useComments,
  useDeleteComment,
  type Activity,
  type Comment,
} from '../../hooks/useTaskFeed'
import { StatusIcon } from '../icons'

function timeAgo(iso: string) {
  const date = parseISO(iso)
  if (differenceInSeconds(new Date(), date) < 45) return 'just now'
  return `${formatDistanceToNowStrict(date)} ago`
}

const fullDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy 'at' h:mm a")

type FeedItem = { kind: 'activity'; item: Activity } | { kind: 'comment'; item: Comment }

/** Comments and change history merged into one chronological timeline. */
export function Feed({ taskId }: { taskId: string }) {
  const comments = useComments(taskId)
  const activity = useActivity(taskId)

  if (comments.isPending || activity.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[60, 45, 70].map((w) => (
          <div key={w} className="flex items-center gap-2.5">
            <div className="size-4 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-3 animate-pulse rounded bg-zinc-100" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    )
  }

  if (comments.error || activity.error) {
    return (
      <p className="text-[13px] text-zinc-500">
        Couldn't load activity.{' '}
        <button
          type="button"
          className="font-medium text-indigo-600 hover:underline"
          onClick={() => {
            void comments.refetch()
            void activity.refetch()
          }}
        >
          Retry
        </button>
      </p>
    )
  }

  const items: FeedItem[] = [
    ...activity.data.map((item) => ({ kind: 'activity' as const, item })),
    ...comments.data.map((item) => ({ kind: 'comment' as const, item })),
  ].sort((a, b) => a.item.created_at.localeCompare(b.item.created_at))

  return (
    <ol className="relative space-y-3.5">
      {/* Timeline rail behind the activity dots. */}
      <div className="absolute top-2 bottom-2 left-[7px] w-px bg-zinc-200" aria-hidden />
      {items.map((entry) =>
        entry.kind === 'activity' ? (
          <ActivityRow key={entry.item.id} activity={entry.item} />
        ) : (
          <CommentRow key={entry.item.id} comment={entry.item} taskId={taskId} />
        ),
      )}
    </ol>
  )
}

function ActivityRow({ activity }: { activity: Activity }) {
  const fragments = describeActivity(activity)
  const to = fragments.findLast((f) => f.status)?.status

  return (
    <li className="relative flex items-start gap-2.5 text-[12.5px] leading-5 text-zinc-500">
      <span className="relative z-10 mt-[3px] grid size-[15px] shrink-0 place-items-center rounded-full bg-surface">
        {to ? <StatusIcon status={to} className="size-3" /> : <span className="size-1.5 rounded-full bg-zinc-300" />}
      </span>
      <p className="min-w-0">
        <span className="font-medium text-zinc-700">You</span>{' '}
        {fragments.map((f, i) =>
          f.strong ? (
            <span key={i} className="font-medium text-zinc-700">
              {f.text}
            </span>
          ) : (
            <span key={i}>{f.text}</span>
          ),
        )}
        <span className="text-zinc-400" title={fullDate(activity.created_at)}>
          {' · '}
          {timeAgo(activity.created_at)}
        </span>
      </p>
    </li>
  )
}

function CommentRow({ comment, taskId }: { comment: Comment; taskId: string }) {
  const remove = useDeleteComment(taskId)

  return (
    <li className="group relative flex items-start gap-2.5">
      <span className="relative z-10 grid size-[15px] shrink-0 place-items-center rounded-full bg-indigo-600 text-[8px] font-semibold text-white ring-2 ring-surface">
        Y
      </span>
      <div className="-mt-0.5 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-surface px-3 py-2 shadow-card">
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="font-medium text-zinc-800">You</span>
          <span className="text-zinc-400" title={fullDate(comment.created_at)}>
            {timeAgo(comment.created_at)}
          </span>
          <button
            type="button"
            onClick={() => remove.mutate(comment)}
            className="ml-auto grid size-5 place-items-center rounded text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Delete comment"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap text-zinc-700">{comment.body}</p>
      </div>
    </li>
  )
}

export function CommentComposer({ taskId, onPosted }: { taskId: string; onPosted?: () => void }) {
  const addComment = useAddComment(taskId)
  const [body, setBody] = useState('')
  const trimmed = body.trim()

  function submit() {
    if (!trimmed) return
    addComment.post(trimmed)
    setBody('')
    onPosted?.()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-end gap-2 rounded-lg border border-zinc-200 bg-surface p-2 transition-colors focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={2000}
        placeholder="Leave a comment…"
        aria-label="Comment"
        className="max-h-32 min-h-7 flex-1 resize-none bg-transparent px-1 py-1 text-[13px] leading-5 text-zinc-800 [field-sizing:content] placeholder:text-zinc-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!trimmed}
        className="grid size-7 shrink-0 place-items-center rounded-md bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:bg-zinc-100 disabled:text-zinc-400"
        aria-label="Post comment"
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  )
}
