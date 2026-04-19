import { nanoid } from "nanoid";

export function makeShortPath(size = 8): string {
  return nanoid(size);
}
