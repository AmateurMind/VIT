import { mutation } from 'convex/server';
import { v } from 'convex/values';

function hashStudentIdentity(email: string) {
  // MVP placeholder: replace with real salted hash per-session
  return `hash_${email.toLowerCase()}`;
}

export const loginWithEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const eligibility = await ctx.db
      .query('eligibility')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (!eligibility?.eligible) {
      throw new Error('Not eligible');
    }

    const now = Date.now();
    const hashedStudentId = hashStudentIdentity(args.email);

    const existing = await ctx.db
      .query('sessions')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        hashedStudentId,
        issuedAt: now,
        expiresAt: now + 1000 * 60 * 60,
      });
      return { hashedStudentId };
    }

    await ctx.db.insert('sessions', {
      email: args.email,
      hashedStudentId,
      issuedAt: now,
      expiresAt: now + 1000 * 60 * 60,
    });

    return { hashedStudentId };
  },
});

export const createElection = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    candidateIds: v.array(v.string()),
    createdByEmail: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('elections', {
      ...args,
      status: 'draft',
      algorandAppId: undefined,
    });
  },
});

export const openElection = mutation({
  args: { electionId: v.id('elections') },
  handler: async (ctx, args) => {
    // TODO: deploy Algorand app + set app id here.
    await ctx.db.patch(args.electionId, { status: 'open' });
  },
});

export const castVote = mutation({
  args: {
    electionId: v.id('elections'),
    email: v.string(),
    candidateId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (!session) {
      throw new Error('No active session');
    }

    // TODO: call Algorand app with hashedStudentId + candidateId.
    const algodTxId = `pending_${Date.now()}`;

    await ctx.db.insert('voteReceipts', {
      electionId: args.electionId,
      hashedStudentId: session.hashedStudentId,
      candidateId: args.candidateId,
      algodTxId,
      submittedAt: Date.now(),
    });

    return { algodTxId };
  },
});

export const syncElectionFromChain = mutation({
  args: {
    electionId: v.id('elections'),
    onChainStatus: v.string(),
    totals: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('electionCache')
      .withIndex('by_election', (q) => q.eq('electionId', args.electionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        onChainStatus: args.onChainStatus,
        totals: args.totals,
        lastSyncedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('electionCache', {
        electionId: args.electionId,
        onChainStatus: args.onChainStatus,
        totals: args.totals,
        lastSyncedAt: Date.now(),
      });
    }
  },
});

export const issueCertificate = mutation({
  args: {
    electionId: v.id('elections'),
    email: v.string(),
    certificateHash: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: submit certificate hash to Algorand app.
    const algodTxId = `pending_${Date.now()}`;

    await ctx.db.insert('certificateCache', {
      electionId: args.electionId,
      email: args.email,
      certificateHash: args.certificateHash,
      algodTxId,
      issuedAt: Date.now(),
    });

    return { algodTxId };
  },
});
