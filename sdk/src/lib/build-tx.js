import { of } from "hyper-async";
import { z } from "zod";

const inputSchema = z.object({
    function: z.string(),
});

export function buildTxWith(env) {
    return (input, tags) => {
        return of(input)
            //.chain() create tags
            //.chain() generate random number as data item
            //.chain() sign with bundlr
            .map(inputSchema.parse);

    };
}