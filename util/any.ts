import fs from "fs";

export function filterMatches<T>(data: T[], callback: (item: T) => boolean): { matches: T[]; nonMatches: T[] } {
  return data.reduce<{ matches: T[]; nonMatches: T[] }>((acc, currentItem) => {
    if (callback(currentItem)) {
      acc.matches.push(currentItem);
    } else {
      acc.nonMatches.push(currentItem);
    }
    return acc;
  }, { matches: [], nonMatches: [] });
}

export function splitBy(str: string, delimiters: string[]): string[] {
  const results: string[] = [];
  let last = "";
  for(let i = 0; i < str.length; i++) {
    if(delimiters.includes(str[i])) {
      results.push(last);
      last = "";
    } else last += str[i];
  }

  if(last.length > 0) results.push(last);
  
  return results;
}

export function getFileContent(path: string): string {
  return fs.readFileSync(path, "utf8");
}

export type SwitchProperty<
  T extends object,
  Property extends keyof T,
  Value
> = Omit<T, Property> & {
  [P in Property]: Value;
};