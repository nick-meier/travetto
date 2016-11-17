import { BaseModel } from './model';
import { ModelCls, getModelConfig, DEFAULT_VIEW } from './service/registry';
import { ObjectUtil } from '@encore/util';

export function convert<T extends BaseModel>(cls: ModelCls<T>, o: T): T {
  let config = getModelConfig(cls);
  if (config.discriminated && !!o._type) {
    return new config.discriminated[o._type](o);
  } else {
    return new cls(o);
  }
}

export function getCls<T extends BaseModel>(o: T): ModelCls<T> {
  return o.constructor as any;
}

export function enumKeys(c: any): string[] {
  return ObjectUtil.values(c).filter((x: any) => typeof x === 'string') as string[];
}

export function bindData(obj: any, data?: any, view: string = DEFAULT_VIEW) {
  let cons = obj.constructor as any;
  let conf = getModelConfig(cons);

  if (view === DEFAULT_VIEW && conf.schemaOpts && conf.schemaOpts.strict === false) {
    for (var k in data) {
      obj[k] = data[k];
    }
  } else if (!!data) {
    let viewConf = conf.views[view];
    if (viewConf.fields) {
      viewConf.fields.forEach((f: string) => {
        if (data[f] !== undefined) {
          obj[f] = data[f];
        }
      });
    } else {
      for (let k of Object.keys(data)) {
        obj[k] = data[k];
      }
    }
  }
}