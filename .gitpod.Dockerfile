FROM gitpod/workspace-full

RUN curl -fsSL https://deno.land/x/install/install.sh | sh
RUN /home/gitpod/.deno/bin/deno completions bash > /home/gitpod/.bashrc.d/90-deno && \
    echo 'export DENO_INSTALL="/home/gitpod/.deno"' >> /home/gitpod/.bashrc.d/90-deno && \
    echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> /home/gitpod/.bashrc.d/90-deno

RUN curl -fsSL https://install_ao.g8way.io | bash
RUN echo 'export AO_INSTALL=/home/gitpod/.ao' >> /home/gitpod/.bashrc.d/101-ao && \
    echo 'export PATH="$AO_INSTALL/bin:$PATH"' >> /home/gitpod/.bashrc.d/101-ao
