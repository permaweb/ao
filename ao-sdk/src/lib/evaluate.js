import { fromPromise, of } from "hyper-async";
import HyperbeamLoader from "@permaweb/hyperbeam-loader";

export const evaluate = (ctx) =>
  of(ctx)
    // verify buffer and interactions
    .chain(setHandle)
    .map(doEvaluation)
    .map((result) => ({ result, ...ctx }));

function doEvaluation(ctx) {
  return reduce(
    (state, action) => ctx.handle(state, action, ctx.SWGlobal),
    ctx.initState,
    ctx.actions,
  );
}

function setHandle(ctx) {
  return fromPromise((buffer) => HyperbeamLoader(buffer))(ctx.src)
    .map((handle) => ({ handle, ...ctx }));
}
