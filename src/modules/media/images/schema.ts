import { z } from "zod";

export const imageSchema = z
  .string()
  .max(2_900_000)
  .refine(
    (value) =>
      value === "" ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
    "Only embedded PNG, JPEG or WebP images are supported.",
  );
