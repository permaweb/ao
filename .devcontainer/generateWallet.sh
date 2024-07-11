cd $(dirname $0)

WALLET_FILE=$1/wallet.json

if [ -f "$WALLET_FILE" ]; then
  echo "$WALLET_FILE already exists. Refusing to overwrite it."
  exit 1
fi

npx --yes @permaweb/wallet > "$WALLET_FILE"

echo "$WALLET_FILE created."