import { Class, ChangeEvent } from '@travetto/registry';
import { SchemaChangeEvent } from '@travetto/schema';

import { ModelQuery, Query, PageableModelQuery } from '../model/query';
import { BulkResponse, BulkOp } from '../model/bulk';
import { ModelCore } from '../model/core';

export type ValidStringFields<T> = {
  [K in keyof T]:
  (T[K] extends (String | string) ? K : never)
}[keyof T];

export interface IModelSource {
  onChange?<T extends ModelCore>(e: ChangeEvent<Class<T>>): void;
  onSchemaChange?(e: SchemaChangeEvent): void;

  generateId(): string;
  prePersist<T extends ModelCore>(cls: Class<T>, model: Partial<T>): Promise<Partial<T>> | Partial<T>;
  prePersist<T extends ModelCore>(cls: Class<T>, model: T): T | Promise<T>;

  postLoad<T extends ModelCore>(cls: Class<T>, model: Partial<T>): Partial<T>;
  postLoad<T extends ModelCore>(cls: Class<T>, model: T): T;

  save<T extends ModelCore>(cls: Class<T>, model: T, keepId?: boolean): Promise<T>;
  saveAll<T extends ModelCore>(cls: Class<T>, models: T[], keepId?: boolean): Promise<T[]>;

  update<T extends ModelCore>(cls: Class<T>, model: T): Promise<T>;
  updateAllByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>, data: Partial<T>): Promise<number>;
  updatePartial<T extends ModelCore>(cls: Class<T>, model: Partial<T>): Promise<T>;
  updatePartialByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>, body: Partial<T>): Promise<T>;

  suggestField<T extends ModelCore, U = T>(
    cls: Class<T>, field: ValidStringFields<T>, query: string, filter?: PageableModelQuery<T>
  ): Promise<U[]>;

  query<T extends ModelCore, U = T>(cls: Class<T>, builder: Query<T>): Promise<U[]>;

  bulkProcess<T extends ModelCore>(cls: Class<T>, operations: BulkOp<T>[]): Promise<BulkResponse>;

  getById<T extends ModelCore>(cls: Class<T>, id: string): Promise<T>;
  getByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>, failOnMany?: boolean): Promise<T>;
  getAllByQuery<T extends ModelCore>(cls: Class<T>, query: PageableModelQuery<T>): Promise<T[]>;
  getCountByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>): Promise<number>;

  deleteById<T extends ModelCore>(cls: Class<T>, id: string): Promise<number>;
  deleteByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>): Promise<number>;
}

// Stupid but necessary
export abstract class ModelSource implements IModelSource {
  onChange?<T extends ModelCore>(e: ChangeEvent<Class<T>>): void;
  onSchemaChange?(e: SchemaChangeEvent): void;

  async postConstruct() {
    await this.initClient();
    await this.initDatabase();
  }

  abstract initClient(): Promise<void>;
  abstract initDatabase(): Promise<void>;
  abstract clearDatabase(): Promise<void>;

  abstract generateId(): string;
  abstract prePersist<T extends ModelCore>(cls: Class<T>, model: Partial<T>): Promise<Partial<T>> | Partial<T>;
  abstract prePersist<T extends ModelCore>(cls: Class<T>, model: T): T | Promise<T>;
  abstract postLoad<T extends ModelCore>(cls: Class<T>, model: Partial<T>): Partial<T>;
  abstract postLoad<T extends ModelCore>(cls: Class<T>, model: T): T;
  abstract save<T extends ModelCore>(cls: Class<T>, model: T, keepId?: boolean): Promise<T>;
  abstract saveAll<T extends ModelCore>(cls: Class<T>, models: T[], keepId?: boolean): Promise<T[]>;
  abstract update<T extends ModelCore>(cls: Class<T>, model: T): Promise<T>;
  abstract updateAllByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>, data: Partial<T>): Promise<number>;
  abstract updatePartial<T extends ModelCore>(cls: Class<T>, model: Partial<T>): Promise<T>;
  abstract updatePartialByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>, body: Partial<T>): Promise<T>;
  abstract suggestField<T extends ModelCore, U = T>(
    cls: Class<T>, field: ValidStringFields<T>, query: string, filter?: PageableModelQuery<T>
  ): Promise<U[]>;
  abstract query<T extends ModelCore, U = T>(cls: Class<T>, builder: Query<T>): Promise<U[]>;
  abstract bulkProcess<T extends ModelCore>(cls: Class<T>, operations: BulkOp<T>[]): Promise<BulkResponse>;
  abstract getById<T extends ModelCore>(cls: Class<T>, id: string): Promise<T>;
  abstract getByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>, failOnMany?: boolean): Promise<T>;
  abstract getAllByQuery<T extends ModelCore>(cls: Class<T>, query: PageableModelQuery<T>): Promise<T[]>;
  abstract getCountByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>): Promise<number>;
  abstract deleteById<T extends ModelCore>(cls: Class<T>, id: string): Promise<number>;
  abstract deleteByQuery<T extends ModelCore>(cls: Class<T>, query: ModelQuery<T>): Promise<number>;
}