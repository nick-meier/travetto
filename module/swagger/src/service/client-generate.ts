import * as fs from 'fs';
import * as path from 'path';

import { DockerContainer } from '@travetto/exec';
import { Injectable } from '@travetto/di';
import { Env } from '@travetto/base';
import { ControllerRegistry } from '@travetto/express';
import { SchemaRegistry } from '@travetto/schema';

import { ApiClientConfig } from './config';
import { SwaggerService } from './swagger';

@Injectable({ autoCreate: { create: Env.watch } })
export class ClientGenerate {

  codeGenCli: DockerContainer;

  constructor(private config: ApiClientConfig, private service: SwaggerService) { }

  async postConstruct() {
    if (this.config.output && this.config.format && Env.watch) {
      console.info('Running code generator in watch mode', this.config.output);

      this.codeGenCli = new DockerContainer(this.config.codeGenImage)
        .setEntryPoint('/bin/sh')
        .setTTY(true)
        .addVolume(this.config.output, this.config.output)
        .setInteractive(true)
        .forceDestroyOnShutdown();

      await this.codeGenCli.create();
      await this.codeGenCli.start();

      setImmediate(() => {
        ControllerRegistry.on(() => setImmediate(() => this.generate(), 1));
        SchemaRegistry.on(() => setImmediate(() => this.generate(), 1));
      }, 1000);
    }
  }

  async generate() {
    const spec = this.service.getSpec();
    const specFile = path.join(this.config.output, 'spec.json');
    await new Promise((res, rej) => fs.writeFile(specFile, JSON.stringify(spec, undefined, 2), (err) => err ? rej(err) : res()));

    const [proc, prom] = await this.codeGenCli.exec([], [
      'java',
      '-jar', '/opt/swagger-codegen-cli/swagger-codegen-cli.jar',
      'generate',
      '--remove-operation-id-prefix',
      '-l', this.config.format,
      '-o', this.config.output,
      '-i', specFile,
      ...(this.config.formatOptions ? ['--additional-properties', this.config.formatOptions] : [])
    ]);

    await prom;
  }
}