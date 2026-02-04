"""
Algorand smart contract outline (PyTeal) for campus voting.
Trust-critical data stored on-chain: votes, election state, certificate hashes.
"""

from pyteal import *

# Global state keys
G_STATUS = Bytes("status")           # "open" | "closed" | "finalized"
G_START = Bytes("start")            # unix ms
G_END = Bytes("end")                # unix ms
G_CANDIDATES = Bytes("candidates")  # encoded list (e.g., csv or ABI)
G_TOTALS = Bytes("totals")          # encoded totals

# Local state keys (per voter)
L_VOTED = Bytes("voted")            # 0 or 1


def approval_program():
  on_create = Seq(
    App.globalPut(G_STATUS, Bytes("open")),
    App.globalPut(G_START, Btoi(Txn.application_args[0])),
    App.globalPut(G_END, Btoi(Txn.application_args[1])),
    App.globalPut(G_CANDIDATES, Txn.application_args[2]),
    App.globalPut(G_TOTALS, Txn.application_args[3]),
    Approve(),
  )

  on_opt_in = Seq(
    App.localPut(Txn.sender(), L_VOTED, Int(0)),
    Approve(),
  )

  # vote(candidate_index)
  on_vote = Seq(
    Assert(App.globalGet(G_STATUS) == Bytes("open")),
    Assert(Global.latest_timestamp() <= App.globalGet(G_END)),
    Assert(App.localGet(Txn.sender(), L_VOTED) == Int(0)),
    # TODO: update encoded totals for candidate
    App.localPut(Txn.sender(), L_VOTED, Int(1)),
    Approve(),
  )

  # close() - auto-close when end time passed
  on_close = Seq(
    Assert(Global.latest_timestamp() > App.globalGet(G_END)),
    App.globalPut(G_STATUS, Bytes("closed")),
    Approve(),
  )

  # finalize() - lock results permanently
  on_finalize = Seq(
    Assert(App.globalGet(G_STATUS) == Bytes("closed")),
    App.globalPut(G_STATUS, Bytes("finalized")),
    Approve(),
  )

  program = Cond(
    [Txn.application_id() == Int(0), on_create],
    [Txn.on_completion() == OnComplete.OptIn, on_opt_in],
    [Txn.application_args[0] == Bytes("vote"), on_vote],
    [Txn.application_args[0] == Bytes("close"), on_close],
    [Txn.application_args[0] == Bytes("finalize"), on_finalize],
  )

  return program


def clear_state_program():
  return Approve()
