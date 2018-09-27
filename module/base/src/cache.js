//@ts-check

const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { Env } = require('./env');

function isOlder(cacheStat, fullStat) {
  return cacheStat.ctimeMs < fullStat.ctimeMs || cacheStat.mtimeMs < fullStat.mtimeMs || cacheStat.atimeMs < fullStat.atimeMs;
}

class Cache {
  constructor(cwd, cacheDir) {

    this.cwd = cwd;

    if (!cacheDir) {
      const name = cwd.replace(/[\\\/:]/g, '_');
      cacheDir = Env.get('TS_CACHE_DIR') || path.join(os.tmpdir(), name);
    }

    this.cacheDir = cacheDir;
    this.cache = {};
  }

  init() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  }

  writeEntry(full, contents) {
    fs.writeFileSync(this.toEntryName(full), contents);
    this.statEntry(full);
  }

  readEntry(full) {
    return fs.readFileSync(this.toEntryName(full)).toString();
  }

  removeExpiredEntry(full, force = false) {
    if (this.hasEntry(full)) {
      if (force || isOlder(this.statEntry(full), fs.statSync(full))) {
        fs.unlinkSync(this.toEntryName(full));
      }
      this.removeEntry(full);
    }
  }

  removeEntry(full) {
    delete this.cache[full];
  }

  hasEntry(full) {
    return !!this.cache[full] || fs.existsSync(this.toEntryName(full));
  }

  statEntry(full) {
    if (!this.cache[full]) {
      const stat = fs.statSync(this.toEntryName(full));
      this.cache[full] = stat;
    }
    return this.cache[full];
  }

  clear() {
    if (this.cacheDir) {
      try {
        if (os.platform().startsWith('win')) {
          execSync(`del /S ${this.cacheDir}`);
        } else {
          execSync(`rm -rf ${this.cacheDir}`);
        }
        console.debug(`Deleted ${this.cacheDir}`);
      } catch (e) {
        console.error('Failed in deleting');
      }
    }
  }

  fromEntryName(cached) {
    return path.join(this.cwd, cached.replace(this.cacheDir, '').replace(/~/g, path.sep)).replace(/[.]js/g, '.ts');
  }

  toEntryName(full) {
    const out = path.join(this.cacheDir, full.replace(this.cwd, '').replace(/^[\\\/]+/, '').replace(/[\/\\]+/g, '~')).replace(/[.]ts/g, '.js');
    return out;
  }
}

class $AppCache extends Cache {
  constructor(cwd, cacheDir) {
    super(cwd, cacheDir);
  }

  init() {
    super.init();

    try {
      // Ensure we have access before trying to delete
      fs.accessSync(this.cacheDir, fs.constants.W_OK);
    } catch (e) {
      return; // Skip trying to delete;
    }

    for (const f of fs.readdirSync(this.cacheDir)) {
      const full = this.fromEntryName(f);
      try {
        this.removeExpiredEntry(full);
      } catch (e) {
        console.debug('Cannot read', e.message);
        // Cannot remove missing file
      }
    }
  }
}

exports.Cache = Cache;

exports.AppCache = new $AppCache(Env.cwd);