from algosdk import account, mnemonic
from algosdk.v2client import algod
import os

def check_balance():
    address = "ICI422L6O6IVOU74ZMVXTTJCWOPZA5TTHTTDBBIOOVOVBEU4D5G3NGJRRY"
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    headers = {"X-Algo-API-Token": algod_token}
    
    try:
        client = algod.AlgodClient(algod_token, algod_address, headers)
        account_info = client.account_info(address)
        micro_algos = account_info.get('amount')
        algos = micro_algos / 1000000
        print(f"Balance for {address}: {algos} ALGO")
        if algos > 0:
            print("FUNDS_AVAILABLE")
        else:
            print("NO_FUNDS")
    except Exception as e:
        print(f"Error checking balance: {e}")

if __name__ == "__main__":
    check_balance()
