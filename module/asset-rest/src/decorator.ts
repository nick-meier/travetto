/// <reference path="./typings.d.ts" />

import { AppError } from '@travetto/base';
import { ControllerRegistry, Request, ParamConfig } from '@travetto/rest';
import { Class } from '@travetto/registry';
import { ConfigSource } from '@travetto/config';
import { Asset } from '@travetto/asset';

import { AssetRestUtil } from './util';
import { AssetRestConfig } from './config';

const globalConf = new AssetRestConfig();
ConfigSource.bindTo(globalConf, 'rest.upload');

const extractUpload = (config: ParamConfig, req: Request) => req.files[config.name!];

export function Upload(param: string | Partial<ParamConfig> & Partial<AssetRestConfig> = {}) {

  if (typeof param === 'string') {
    param = { name: param };
  }

  const finalConf = { ...globalConf, ...param };

  if (finalConf.type !== Asset) {
    throw new AppError('Cannot use upload decorator with anything but an Asset', 'general');
  }

  return function (target: Object, propertyKey: string, index: number) {
    const handler = target.constructor.prototype[propertyKey];
    ControllerRegistry.registerEndpointParameter(target.constructor as Class, handler, {
      ...param as ParamConfig,
      location: 'files' as any,
      async resolve(req: Request) {
        if (!req.files) { // Prevent duplication if given multiple decorators
          req.files = await AssetRestUtil.upload(req, finalConf, `${(target.constructor as any).basePath}/`);
        }
      },
      extract: extractUpload
    }, index);
  };
}