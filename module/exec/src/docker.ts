import * as fs from 'fs';
import * as util from 'util';

import { Shutdown, Env, FsUtil } from '@travetto/base';

import { Exec } from './exec';
import { ExecUtil } from './util';
import { ExecutionState } from './types';
const fsWriteFile = util.promisify(fs.writeFile);

export class DockerContainer {

  private static getContainerName(image: string, container?: string) {
    return container || `${Env.get('DOCKER_NS', image)}-${Date.now()}-${Math.random()}`.replace(/[^A-Z0-9a-z\-]/g, '');
  }

  private cmd: string = 'docker';
  private _exec: ExecutionState;

  private container: string;
  private env: { [key: string]: string } = {};
  private ports: { [key: string]: number } = {};
  private tempVolumes: { [key: string]: string } = {};
  private deleteOnFinish = false;

  private entryPoint: string;
  public runAway: boolean = false;
  public evict: boolean = false;
  public interactive: boolean = false;
  public tty: boolean = false;
  public daemon: boolean = false;

  public volumes: { [key: string]: string } = {};
  public workingDir: string;

  constructor(private image: string, container?: string) {
    this.container = DockerContainer.getContainerName(image, container);
  }

  private watchForEviction(state: ExecutionState, all = false) {
    state.result = state.result.catch(e => {
      if (all || e.killed) {
        this.evict = true;
        delete this._exec;
      }
      throw e;
    });
    return state;
  }

  private _cmd(op: 'create' | 'run' | 'start' | 'stop' | 'exec', ...args: any[]) {
    const state = Exec.spawn(this.cmd, [op, ...(args || [])], { shell: this.tty });
    return (op !== 'run' && op !== 'exec') ? this.watchForEviction(state, true) : state;
  }

  get id() {
    return this._exec && !this._exec.process.killed ? this._exec.process.pid : -1;
  }

  forceDestroyOnShutdown() {
    Shutdown.onShutdown(this.container, () => this.forceDestroy());
    return this;
  }

  setDeleteOnFinish(yes: boolean) {
    this.deleteOnFinish = yes;
    return this;
  }

  createTempVolume(volume: string) {
    const p = fs.mkdtempSync(`/tmp/${this.image.replace(/[^A-Za-z0-9]/g, '_')}`);
    this.tempVolumes[volume] = p;
    return this;
  }

  getTempVolumePath(volume: string) {
    return this.tempVolumes[volume];
  }

  exposePort(port: number, internalPort = port) {
    this.ports[port] = internalPort;
    return this;
  }

  addEnvVar(key: string, value: string) {
    this.env[key] = value;
    return this;
  }

  addEnvVars(vars: { [key: string]: string }) {
    Object.assign(this.env, vars);
    return this;
  }

  addVolume(local: string, container: string) {
    this.volumes[local] = container;
    return this;
  }

  setWorkingDir(container: string) {
    this.workingDir = container;
    return this;
  }

  setInteractive(on: boolean) {
    this.interactive = on;
    return this;
  }

  setTTY(on: boolean) {
    this.tty = on;
    return this;
  }

  setEntryPoint(point: string) {
    this.entryPoint = point;
    return this;
  }

  setDaemon(on: boolean) {
    this.daemon = on;
    return this;
  }

  getRuntimeFlags(extra?: string[]) {
    const flags = [];
    if (this.interactive) {
      flags.push('-i');
    }
    if (this.tty) {
      flags.push('-t');
    }
    for (const k of Object.keys(this.env)) {
      flags.push('-e', `"${k}=${this.env[k]}"`);
    }
    flags.push(...(extra || []));
    return flags;
  }

  getFlags(extra?: string[]) {
    const flags = [];
    if (this.workingDir) {
      flags.push('-w', this.workingDir);
    }
    if (this.deleteOnFinish) {
      flags.push('--rm');
    }
    if (this.entryPoint) {
      flags.push('--entrypoint', this.entryPoint);
    }
    if (this.daemon) {
      flags.push('-d');
    }
    for (const k of Object.keys(this.volumes)) {
      flags.push('-v', `${k}:${this.volumes[k]}`);
    }
    for (const k of Object.keys(this.tempVolumes)) {
      flags.push('-v', `${this.tempVolumes[k]}:${k}`);
    }
    for (const k of Object.keys(this.ports)) {
      flags.push('-p', `${k}:${this.ports[k]}`);
    }
    for (const k of Object.keys(this.env)) {
      flags.push('-e', `"${k}=${this.env[k]}"`);
    }

    flags.push(...this.getRuntimeFlags(extra));

    return flags;
  }

  async initTemp() {
    await Promise.all( // Make temp dirs
      Object.keys(this.tempVolumes).map(x => FsUtil.mkdirp(x)));
  }

  async create(args?: string[], flags?: string[]) {
    const allFlags = this.getFlags(flags);
    return this._cmd('create', '--name', this.container, ...allFlags, this.image, ...(args || [])).result;
  }

  async start(args?: string[], flags?: string[]) {
    await this.initTemp();
    return this._cmd('start', ...(flags || []), this.container, ...(args || [])).result;
  }

  async stop(args?: string[], flags?: string[]) {
    const toStop = this._cmd('stop', ...(flags || []), this.container, ...(args || [])).result;
    let prom = toStop;
    if (this._exec) {
      prom = Promise.all([toStop, this._exec.result]).then(x => x[0]);
    }
    return prom;
  }

  exec(args?: string[], extraFlags?: string[]) {
    const flags = this.getRuntimeFlags(extraFlags);
    this._exec = this._cmd('exec', ...flags, this.container, ...(args || []));
    this._exec.result = this._exec.result.finally(() => delete this._exec);
    return this._exec;
  }

  async run(args?: any[], flags?: string[]) {

    if (!this.deleteOnFinish) {
      // Kill existing
      await this.destroy();
      await this.removeDanglingVolumes();
    }

    await this.initTemp();

    const state = this._cmd('run', `--name=${this.container}`, ...this.getFlags(flags), this.image, ...(args || []));
    this._exec = this.watchForEviction(state);
    this._exec.process.unref();
    return this._exec.result;
  }

  async validate() {
    return !this.runAway;
  }

  async destroy(runAway: boolean = false) {
    console.debug('Destroying', this.image, this.container);
    this.runAway = this.runAway || runAway;

    try {
      await Exec.spawn(this.cmd, ['kill', this.container]).result;
    } catch (e) { /* ignore */ }

    console.debug('Removing', this.image, this.container);

    try {
      await Exec.spawn(this.cmd, ['rm', '-fv', this.container]).result;
    } catch (e) { /* ignore */ }

    if (this._exec) {
      const state = this._exec;
      delete this._exec;
      await state.result;
    }

    await this.cleanup();
  }

  forceDestroy() { // Cannot be async as it's used on exit, that's why it's all sync
    try {
      Exec.execSync(`${this.cmd} kill ${this.container}`);
    } catch (e) { /* ignore */ }

    console.debug('Removing', this.image, this.container);

    try {
      Exec.execSync(`${this.cmd} rm -fv ${this.container}`);
    } catch (e) { /* ignore */ }

    this.cleanupSync();

    const ids = Exec.execSync(`${this.cmd} volume ls -qf dangling=true`);
    if (ids) {
      Exec.execSync(`${this.cmd} volume rm ${ids.split('\n').join(' ')}`);
    }
  }

  async writeFiles(dir: string, files?: { name: string, content: string }[]) {
    await this.cleanup();
    if (files) {
      await Promise.all(
        files.map(({ name, content }) =>
          fsWriteFile(FsUtil.joinUnix(dir, name), content, { mode: '755' })
        )
      );
    }
    return;
  }

  async cleanup() {
    console.debug('Cleaning', this.image, this.container);

    await Promise.all(
      Object.keys(this.tempVolumes)
        .map(x => FsUtil.unlinkRecursive(x, true))
    );
  }

  cleanupSync() {
    console.debug('Cleaning', this.image, this.container);

    for (const vol of Object.keys(this.tempVolumes)) {
      FsUtil.unlinkRecursiveSync(vol, true);
    }
  }

  async removeDanglingVolumes() {
    try {
      const { result } = Exec.spawn(this.cmd, ['volume', 'ls', '-qf', 'dangling=true']);
      const ids = (await result).stdout.trim();
      if (ids) {
        await Exec.spawn(this.cmd, ['volume', 'rm', ...ids.split('\n')]).result;
      }
    } catch (e) {
      // error
    }
  }

  waitForPorts(timeout = 5000) {
    return Promise.all(
      Object.keys(this.ports)
        .map(x => ExecUtil.waitForPort(parseInt(x, 10), timeout))
    );
  }
}