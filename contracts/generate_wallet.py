"""
Generate a new Algorand wallet for testing.
Run this once to get your address and mnemonic.
"""
from algosdk import account, mnemonic

# Generate new account
private_key, address = account.generate_account()
mn = mnemonic.from_private_key(private_key)

print("=" * 60)
print("NEW ALGORAND TESTNET WALLET")
print("=" * 60)
print()
print("ADDRESS (copy this to get free ALGO):")
print(address)
print()
print("MNEMONIC (25 words - keep this safe!):")
print(mn)
print()
print("=" * 60)
print("NEXT STEPS:")
print("1. Go to: https://bank.testnet.algorand.network/")
print("2. Paste your ADDRESS above")
print("3. Get free test ALGO")
print("4. Then run: python deploy_voting.py")
print("=" * 60)
