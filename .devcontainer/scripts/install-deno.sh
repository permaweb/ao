INSTALL=$1
if [ "$INSTALL" = "true" ]; then
    curl -fsSL https://deno.land/install.sh | sh
else
    echo "Skipping DENO Installation..."
fi

