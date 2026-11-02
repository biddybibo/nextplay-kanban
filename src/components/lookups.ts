import { createContext, useContext } from 'react'
import type { Label, Member } from '../lib/types'

export type Lookups = {
  members: Member[]
  labels: Label[]
  memberById: Map<string, Member>
  labelById: Map<string, Label>
}

const empty: Lookups = { members: [], labels: [], memberById: new Map(), labelById: new Map() }

/** Members and labels, provided once at the workspace so cards don't each subscribe. */
export const LookupContext = createContext<Lookups>(empty)

export const useLookups = () => useContext(LookupContext)

export function buildLookups(members: Member[], labels: Label[]): Lookups {
  return {
    members,
    labels,
    memberById: new Map(members.map((m) => [m.id, m])),
    labelById: new Map(labels.map((l) => [l.id, l])),
  }
}
