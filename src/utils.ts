export function keys<T>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

export function sanitize(s: string) {
  // used pdf fonts does not support these characters
  return s
    .replace("č", "c")
    .replace("ř", "r")
    .replace("Ř", "R")
    .replace("ň", "n");
}

export async function forEachAsync<TIn, TOut>(
  input: TIn[],
  callback: (input: TIn) => Promise<TOut>
) {
  for (let i = 0; i < input.length; i++) {
    await callback(input[i]!);
  }
}
