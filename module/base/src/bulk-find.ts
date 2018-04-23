import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

const fsReadFileAsync = util.promisify(fs.readFile);
const fsStat = util.promisify(fs.lstat);
const fsReaddir = util.promisify(fs.readdir);

export interface Entry {
  file: string;
  stats: fs.Stats;
  children?: Entry[]
}

export type Handler = { test: (relative: string, entry?: Entry) => boolean };

export async function bulkFind(handlers: Handler[], base?: string) {
  const res = await Promise.all(handlers.map(x => scanDir(x, base)));
  const names = new Set<string>();
  const out = [];
  for (const ls of res) {
    for (const e of ls) {
      if (!names.has(e.file)) {
        names.add(e.file);
        out.push(e);
      }
    }
  }
  return out;
}

export function scanDir(handler: Handler, base?: string, curBase?: string) {
  return new Promise<Entry[]>(async (resolve, reject) => {
    try {
      const out: Entry[] = [];

      base = base || process.cwd();
      curBase = curBase || base;

      for (const file of (await fsReaddir(base))) {
        const full = `${curBase}${path.sep}${file}`;
        const stats = await fsStat(full);
        const entry: Entry = { stats, file };

        if (stats.isDirectory()) {
          entry.children = await scanDir(handler, base, full);
          out.push(entry);
          if (entry.children.length) {
            out.push(...entry.children);
          }
        } else if (handler.test(entry.file.replace(base, ''), entry)) {
          out.push(entry);
        }
        resolve(out);
      }
    } catch (e) {
      reject(e);
    }
  });
}

export function bulkFindSync(handlers: Handler[], base?: string) {
  const names = new Set<string>();
  const out = [];
  for (const h of handlers) {
    for (const e of scanDirSync(h, base)) {
      if (!names.has(e.file)) {
        names.add(e.file);
        out.push(e);
      }
    }
  }
  return out;
}

export function scanDirSync(handler: Handler, base?: string, relBase?: string) {
  const out: Entry[] = [];

  base = base || process.cwd();
  relBase = relBase || base;

  for (const file of fs.readdirSync(relBase)) {
    const full = `${relBase}${path.sep}${file}`;
    const stats = fs.lstatSync(full);
    const entry: Entry = { stats, file };

    if (stats.isDirectory()) {
      entry.children = scanDirSync(handler, base, full);
      out.push(entry);
      if (entry.children.length) {
        out.push(...entry.children);
      }
    } else if (handler.test(entry.file.replace(base, ''))) {
      out.push(entry);
    }
  }
  return out;
}

export function bulkRequire<T = any>(handlers: Handler[]): T[] {
  return bulkFindSync(handlers)
    .filter(x => !x.stats.isDirectory()) // Skip folders
    .map(x => require(x.file))
    .filter(x => !!x); // Return non-empty values
}

export async function bulkRead(handlers: Handler[]) {
  const files = await bulkFind(handlers);
  const promises = files.map(x => fsReadFileAsync(x.file).then(d => ({ name: x.file, data: d.toString() })));
  return await Promise.all(promises);
}

export function bulkReadSync(handlers: Handler[]) {
  const files = bulkFindSync(handlers);
  return files.map(x => ({ name: x.file, data: fs.readFileSync(x.file).toString() }));
}