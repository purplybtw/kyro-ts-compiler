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

export function getFileContent(path: string): string {
  return fs.readFileSync(path, "utf8");
}