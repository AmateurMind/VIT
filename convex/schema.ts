import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  elections: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(v.literal('draft'), v.literal('open'), v.literal('closed'), v.literal('finalized')),
    candidateIds: v.array(v.string()),
    algorandAppId: v.optional(v.number()),
    createdByEmail: v.string(),
  }).index('by_status', ['status']),

  eligibility: defineTable({
    email: v.string(),
    eligible: v.boolean(),
    cohort: v.optional(v.string()),
  }).index('by_email', ['email']),

  sessions: defineTable({
    email: v.string(),
    hashedStudentId: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
  }).index('by_email', ['email']),

  voteReceipts: defineTable({
    electionId: v.id('elections'),
    hashedStudentId: v.string(),
    candidateId: v.string(),
    algodTxId: v.string(),
    submittedAt: v.number(),
  }).index('by_election', ['electionId']),

  electionCache: defineTable({
    electionId: v.id('elections'),
    onChainStatus: v.string(),
    totals: v.any(),
    lastSyncedAt: v.number(),
  }).index('by_election', ['electionId']),

  certificateCache: defineTable({
    electionId: v.id('elections'),
    email: v.string(),
    certificateHash: v.string(),
    algodTxId: v.string(),
    issuedAt: v.number(),
  }).index('by_election', ['electionId']),
});
