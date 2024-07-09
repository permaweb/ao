INSTALL=$1
if [ "$INSTALL" = "true" ]; then
    apt-get -y install python3.9 python3-pip
    pip3 install pyyaml
else
    echo "Skipping Python Installation..."
fi
