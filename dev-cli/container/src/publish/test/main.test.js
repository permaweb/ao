import { suite } from "uvu";
import * as assert from "uvu/assert";

import { uploadWith } from "../src/main.js";

function group(name, fn) {
  const group = suite(name);
  fn(group);
  group.run();
}

const happy = {
  walletExists: async () => true,
  artifactExists: async () => ({ foo: "bar" }),
  readWallet: async () => ({ id: "id-123" }),
  upload: async (params) => ({ params, id: "123" }),
};

group("uploadWith", (it) => {
  it("should publish the artifact to arweave", async () => {
    const upload = uploadWith(happy);

    const res = await upload({
      walletPath: "/path/to/wallet.json",
      artifactPath: "/path/to/artifact.wasm",
      to: "https://fake.place",
      tags: [
        { name: "foo", value: "bar" },
      ],
    });

    assert.equal(res, "123");
  });

  it("should pass the correct args to upload", async () => {
    const upload = uploadWith({
      ...happy,
      upload: (params) => {
        assert.equal(params, {
          path: "/path/to/artifact.wasm",
          wallet: { id: "id-123" },
          to: "https://fake.place",
          tags: [
            { name: "foo", value: "bar" },
          ],
        });

        return { id: "123" };
      },
    });

    await upload({
      walletPath: "/path/to/wallet.json",
      artifactPath: "/path/to/artifact.wasm",
      to: "https://fake.place",
      tags: [
        { name: "foo", value: "bar" },
      ],
    });
  });

  it("should throw if the wallet does not exist", async () => {
    const upload = uploadWith({ ...happy, walletExists: async () => false });

    await upload({
      walletPath: "/path/to/wallet.json",
      artifactPath: "/path/to/artifact.wasm",
      to: "https://fake.place",
      tags: [
        { name: "foo", value: "bar" },
      ],
    }).then(assert.unreachable)
      .catch((err) => assert.equal(err.code, "WalletNotFound"));
  });

  it("should throw if the artifact does not exist", async () => {
    const upload = uploadWith({ ...happy, artifactExists: async () => false });

    await upload({
      walletPath: "/path/to/wallet.json",
      artifactPath: "/path/to/artifact.wasm",
      to: "https://fake.place",
      tags: [
        { name: "foo", value: "bar" },
      ],
    }).then(assert.unreachable)
      .catch((err) => assert.equal(err.code, "ArtifactNotFound"));
  });
});
