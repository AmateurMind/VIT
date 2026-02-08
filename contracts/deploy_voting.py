"""
Deploy script for the campus voting app (Algorand TestNet).

Required environment variables:
- ALGOD_ADDRESS    (example: https://testnet-api.algonode.cloud)
- ALGOD_TOKEN      (empty string for AlgoNode)
- DEPLOYER_MNEMONIC
"""

import base64
import os

from algosdk import account, mnemonic
from algosdk.transaction import (
    ApplicationCreateTxn,
    OnComplete,
    StateSchema,
    wait_for_confirmation,
)
from algosdk.v2client import algod
from pyteal import Mode, compileTeal

from voting import approval_program, clear_state_program


def compile_program(client: algod.AlgodClient, source: str) -> bytes:
    response = client.compile(source)
    return base64.b64decode(response["result"])


def get_algod_client() -> algod.AlgodClient:
    address = os.getenv("ALGOD_ADDRESS", "https://testnet-api.algonode.cloud")
    token = os.getenv("ALGOD_TOKEN", "")
    headers = {"X-Algo-API-Token": token} if token else None
    return algod.AlgodClient(token, address, headers)


def main() -> None:
    deployer_mn = os.environ["DEPLOYER_MNEMONIC"]
    private_key = mnemonic.to_private_key(deployer_mn)
    sender = account.address_from_private_key(private_key)

    client = get_algod_client()
    suggested_params = client.suggested_params()

    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear_teal = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
    approval_bytes = compile_program(client, approval_teal)
    clear_bytes = compile_program(client, clear_teal)

    # Global: is_open, option_0, option_1 (3 uint) + creator (1 byte slice)
    global_schema = StateSchema(num_uints=3, num_byte_slices=1)
    # Local: has_voted, choice (2 uint)
    local_schema = StateSchema(num_uints=2, num_byte_slices=0)

    txn = ApplicationCreateTxn(
        sender=sender,
        sp=suggested_params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[],
    )

    signed = txn.sign(private_key)
    txid = client.send_transaction(signed)
    result = wait_for_confirmation(client, txid, 4)
    app_id = result["application-index"]

    print(f"Deployer Address: {sender}")
    print(f"Create Tx ID: {txid}")
    print(f"App ID: {app_id}")
    print(f"Explorer: https://testnet.algoexplorer.io/application/{app_id}")


if __name__ == "__main__":
    main()
