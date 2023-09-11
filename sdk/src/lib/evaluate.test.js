import test from "node:test";

test("evaluate state", async () => {
  // context should have
  // - initial state
  // - src binary
  // - interactions
  // then fold over each interaction creating new state and messages
  // each state evaluation we should cache in a database
});
