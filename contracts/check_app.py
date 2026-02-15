from algosdk.v2client import algod
import os

def check_app():
    app_id = 755425121
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    headers = {"X-Algo-API-Token": algod_token}
    
    try:
        client = algod.AlgodClient(algod_token, algod_address, headers)
        info = client.application_info(app_id)
        print(f"App {app_id} found!")
        print(f"Creator: {info['params']['creator']}")
    except Exception as e:
        print(f"Error checking app: {e}")

if __name__ == "__main__":
    check_app()
