if [ "$INSTALL_PYTHON" = "true" ]; then
    apt-get -y install --no-install-recommends libbluetooth-dev tk-dev uuid-dev
    set -eux
    wget -O python.tar.xz "https://www.python.org/ftp/python/${PYTHON_VERSION%%[a-z]*}/Python-$PYTHON_VERSION.tar.xz"
    wget -O python.tar.xz.asc "https://www.python.org/ftp/python/${PYTHON_VERSION%%[a-z]*}/Python-$PYTHON_VERSION.tar.xz.asc"
    GNUPGHOME="$(mktemp -d)"
    export GNUPGHOME
    gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$GPG_KEY"
    gpg --batch --verify python.tar.xz.asc python.tar.xz
    gpgconf --kill all
    rm -rf "$GNUPGHOME" python.tar.xz.asc
    mkdir -p /usr/src/python
    tar --extract --directory /usr/src/python --strip-components=1 --file python.tar.xz
    rm python.tar.xz
    cd /usr/src/python
    gnuArch="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)"
    ./configure \
        --build="$gnuArch" \
        --enable-loadable-sqlite-extensions \
        --enable-optimizations \
        --enable-option-checking=fatal \
        --enable-shared \
        --with-system-expat \
        --without-ensurepip
    nproc="$(nproc)"
    EXTRA_CFLAGS="$(dpkg-buildflags --get CFLAGS)"
    LDFLAGS="$(dpkg-buildflags --get LDFLAGS)"
    make -j "$nproc" \
        "EXTRA_CFLAGS=${EXTRA_CFLAGS:-}" \
        "LDFLAGS=${LDFLAGS:-}" \
        "PROFILE_TASK=${PROFILE_TASK:-}"
    # https://github.com/docker-library/python/issues/784
    # prevent accidental usage of a system installed libpython of the same version
    rm python
    make -j "$nproc" \
        "EXTRA_CFLAGS=${EXTRA_CFLAGS:-}" \
        "LDFLAGS=${LDFLAGS:--Wl},-rpath='\$\$ORIGIN/../lib'" \
        "PROFILE_TASK=${PROFILE_TASK:-}" \
        python
    make install

    # enable GDB to load debugging data: https://github.com/docker-library/python/pull/701
    bin="$(readlink -ve /usr/local/bin/python3)"
    dir="$(dirname "$bin")"
    mkdir -p "/usr/share/gdb/auto-load/$dir"
    cp -vL Tools/gdb/libpython.py "/usr/share/gdb/auto-load/$bin-gdb.py"
    cd /
    rm -rf /usr/src/python
    find /usr/local -depth \
        \( \
        \( -type d -a \( -name test -o -name tests -o -name idle_test \) \) \
        -o \( -type f -a \( -name '*.pyc' -o -name '*.pyo' -o -name 'libpython*.a' \) \) \
        \) -exec rm -rf '{}' + \
        ;
    ldconfig
    python3 --version

    # make some useful symlinks that are expected to exist ("/usr/local/bin/python" and friends)
    for src in idle3 pydoc3 python3 python3-config; do
        dst="$(echo "$src" | tr -d 3)"
        [ -s "/usr/local/bin/$src" ]
        [ ! -e "/usr/local/bin/$dst" ]
        ln -svT "$src" "/usr/local/bin/$dst"
    done

    wget -O get-pip.py "$PYTHON_GET_PIP_URL"
    echo "$PYTHON_GET_PIP_SHA256 *get-pip.py" | sha256sum -c -
    export PYTHONDONTWRITEBYTECODE=1
    python get-pip.py \
        --disable-pip-version-check \
        --no-cache-dir \
        --no-compile \
        "pip==$PYTHON_PIP_VERSION" \
        "setuptools==$PYTHON_SETUPTOOLS_VERSION"
    rm -f get-pip.py
    pip --version
else
    echo "Skipping Python Installation..."
fi
