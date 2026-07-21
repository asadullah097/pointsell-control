import { randomInt } from 'crypto';

const LOWER = 'abcdefghijkmnpqrstuvwxyz'; // no l/o — avoid look-alikes
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O
const DIGITS = '23456789'; // no 0/1
const SYMBOLS = '!@#$%&*';

/** Generates a random password that's easy to read aloud/type but still meets complexity rules. */
export function generateTempPassword(length = 12): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: length - required.length }, () => pick(all));
  return shuffle([...required, ...rest]).join('');
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
