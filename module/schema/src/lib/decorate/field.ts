import { ObjectUtil } from '@encore/util';
import { SchemaRegistry, ClsList } from '../service';
import { Re } from '../util';
import 'reflect-metadata';

function prop(obj: { [key: string]: any }) {
  return (f: any, prop: string) => {
    SchemaRegistry.registerFieldFacet(f, prop, obj);
  };
}

function enumKeys(c: any): string[] {
  if (Array.isArray(c) && typeof c[0] === 'string') {
    return c;
  } else {
    return ObjectUtil.values(c).filter((x: any) => typeof x === 'string') as string[];
  }
}

export function Field(type: ClsList) {
  return (f: any, prop: string) => { SchemaRegistry.registerFieldConfig(f, prop, type); };
};
export const Alias = (...aliases: string[]) => prop({ aliases });
export const Required = () => prop({ required: true });
export const Enum = (vals: string[] | any, message?: string) => {
  let values = enumKeys(vals);
  message = message || `{PATH} is only allowed to be "${values.join('" or "')}"`;
  return prop({ enum: { values, message } });
};
export const Trimmed = () => prop({ trim: true });
export const Match = (re: RegExp, message?: string) => prop({ match: [re, message || (re as any).message] });
export const MinLength = (n: number, message?: string) => prop({ minlength: [n, message] });
export const MaxLength = (n: number, message?: string) => prop({ maxlength: [n, message] });
export const Min = (n: number | Date, message?: string) => prop({ min: [n, message] });
export const Max = (n: number | Date, message?: string) => prop({ max: [n, message] });
export const Email = (message?: string) => Match(Re.EMAIL, message);
export const Telephone = (message?: string) => Match(Re.TELEPHONE, message);
export const Url = (message?: string) => Match(Re.URL, message);

export function View(...names: string[]) {
  return (f: any, prop: string) => {
    for (let name of names) {
      SchemaRegistry.registerFieldFacet(f, prop, {}, name);
    }
  };
}
