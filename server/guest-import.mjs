import { z } from "zod";
import { schemas } from "./validation.mjs";
export const guestImportSchema = z
  .object({
    batchId: z.uuid(),
    rows: z
      .array(
        z.object({
          sourceRow: z.number().int().min(1).max(100000),
          guest: schemas.guests,
          allowDuplicate: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(500),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.rows.map((row) => row.sourceRow)).size !== value.rows.length
    )
      context.addIssue({
        code: "custom",
        message: "Quellzeilen müssen eindeutig sein.",
        path: ["rows"],
      });
  });
