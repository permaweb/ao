import { of } from "hyper-async";
import { z } from "zod";

const inputSchema = z.object({
    function: z.string(),
});

export function buildTxWith(env) {
    return (input) => {
        return of(input)
            .map(inputSchema.parse);
    };
}