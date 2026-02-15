"""
Minimal PyTeal voting contract for the PS-2 campus trust MVP.

Rules:
- Votes are on-chain (Algorand state).
- One wallet can vote once.
- Contract creator can close voting.
"""

from pyteal import *


# Global state keys
G_CREATOR = Bytes("creator")
G_IS_OPEN = Bytes("is_open")
G_OPTION_0 = Bytes("option_0")
G_OPTION_1 = Bytes("option_1")

# Local state keys
L_HAS_VOTED = Bytes("has_voted")
L_CHOICE = Bytes("choice")

# App call methods
M_VOTE = Bytes("vote")
M_CLOSE = Bytes("close")


def approval_program() -> Expr:
    # Create with 2 choices (index 0 and 1). Keep logic intentionally simple.
    on_create = Seq(
        App.globalPut(G_CREATOR, Txn.sender()),
        App.globalPut(G_IS_OPEN, Int(1)),
        App.globalPut(G_OPTION_0, Int(0)),
        App.globalPut(G_OPTION_1, Int(0)),
        Approve(),
    )

    # User must opt in once so we can keep per-wallet vote state on-chain.
    on_opt_in = Seq(
        App.localPut(Txn.sender(), L_HAS_VOTED, Int(0)),
        App.localPut(Txn.sender(), L_CHOICE, Int(0)),
        Approve(),
    )

    vote_choice = Btoi(Txn.application_args[1])
    on_vote = Seq(
        Assert(App.globalGet(G_IS_OPEN) == Int(1)),
        Assert(App.optedIn(Txn.sender(), Txn.application_id())),
        Assert(App.localGet(Txn.sender(), L_HAS_VOTED) == Int(0)),
        Assert(Txn.application_args.length() == Int(2)),
        Assert(vote_choice <= Int(1)),
        If(vote_choice == Int(0))
        .Then(App.globalPut(G_OPTION_0, App.globalGet(G_OPTION_0) + Int(1)))
        .Else(App.globalPut(G_OPTION_1, App.globalGet(G_OPTION_1) + Int(1))),
        App.localPut(Txn.sender(), L_HAS_VOTED, Int(1)),
        App.localPut(Txn.sender(), L_CHOICE, vote_choice),
        Approve(),
    )

    on_close = Seq(
        Assert(Txn.sender() == App.globalGet(G_CREATOR)),
        App.globalPut(G_IS_OPEN, Int(0)),
        Approve(),
    )

    # Reject close-out and clear so local vote state cannot be reset.
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.OptIn, on_opt_in],
        [Txn.on_completion() == OnComplete.CloseOut, Reject()],
        [Txn.on_completion() == OnComplete.ClearState, Reject()],
        [Txn.on_completion() == OnComplete.UpdateApplication, Reject()],
        [Txn.on_completion() == OnComplete.DeleteApplication, Reject()],
        [
            And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args.length() > Int(0),
                Txn.application_args[0] == M_VOTE,
            ),
            on_vote,
        ],
        [
            And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args.length() > Int(0),
                Txn.application_args[0] == M_CLOSE,
            ),
            on_close,
        ],
    )
    return program


def clear_state_program() -> Expr:
    # Return Reject() to preserve "one wallet = one vote" invariant.
    return Reject()


if __name__ == "__main__":
    print(compileTeal(approval_program(), mode=Mode.Application, version=8))
