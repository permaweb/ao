# Demo wasm 

You do need:

* nodejs installed
* docker installed

To run the demo you to do the following steps

1. compile docker image 

```sh
cd dev-cli/container
./build.sh
```

2. compile lua to wasm

```sh
cd dev-cli/demo
docker run -v .:/src p3rmaw3b/ao emcc-lua
```

3. run demo.js

```sh
node demo.js
```