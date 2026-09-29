import { z } from "zod";

export const playerPlaylistSchema = z.object({
  id: z.string().uuid(), version: z.number().int().nonnegative(),
  items: z.array(z.object({
    id: z.string().uuid(), durationOverride: z.number().finite().nullable(),
    media: z.object({ id: z.string().uuid(), type: z.enum(["image", "video"]), url: z.string().min(1), name: z.string(), duration: z.number().finite().nullable() }),
  })),
});
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const playerRegistrationSchema = z.object({ tvId: z.string().uuid(), code: z.string(), token });
export const playerPairSchema = z.object({ paired: z.boolean(), code: z.string(), token: token.optional() });
const timing = { serverNow: z.string().datetime(), nextChangeAt: z.string().datetime().nullable() };
export const playerConfigSchema = z.union([
  z.object({ paired: z.literal(false) }),
  z.object({ paired: z.literal(true), unchanged: z.literal(true), ...timing }),
  z.object({ paired: z.literal(true), playlist: playerPlaylistSchema.nullable(), ...timing }),
]);
export type PlayerPlaylist = z.infer<typeof playerPlaylistSchema>;
