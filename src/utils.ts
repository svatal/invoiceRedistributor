export function keys<T extends Object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

export function sanitize(s: string) {
  return s;
  // standard pdf fonts does not support these characters, custom font does
  // .replace("č", "c")
  // .replace("ř", "r")
  // .replace("Ř", "R")
  // .replace("ň", "n");
}

export async function forEachAsync<TIn, TOut>(
  input: TIn[],
  callback: (input: TIn) => Promise<TOut>
) {
  for (let i = 0; i < input.length; i++) {
    await callback(input[i]!);
  }
}

export function isDefined<T>(o: T | undefined): o is T {
  return o !== undefined;
}

export function toArray<T>(input: T | T[] | undefined): T[] {
  return input === undefined ? [] : Array.isArray(input) ? input : [input];
}
