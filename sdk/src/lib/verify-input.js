import { of } from "hyper-async";
import { z } from "zod";

const inputSchema = z.object({
    function: z.string().min(
        1,
        { message: "function not provided on input" },
    ),
});

export function verifyInputWith() {
    return (input) => {
        return of(input)
            .map(inputSchema.parse);
    };
}