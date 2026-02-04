import { query } from 'convex/server';
import { v } from 'convex/values';

export const listOpenElections = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('elections')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .collect();
  },
});

export const getElection = query({
  args: { electionId: v.id('elections') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.electionId);
  },
});

export const getSession = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('sessions')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
  },
});

export const getElectionCache = query({
  args: { electionId: v.id('elections') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('electionCache')
      .withIndex('by_election', (q) => q.eq('electionId', args.electionId))
      .first();
  },
});

export const getCertificates = query({
  args: { electionId: v.id('elections') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('certificateCache')
      .withIndex('by_election', (q) => q.eq('electionId', args.electionId))
      .collect();
  },
});
