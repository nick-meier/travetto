import { FieldConfig } from '@travetto/schema';
import { Injectable } from '@travetto/di';
import { AsyncContext } from '@travetto/context';

import { SQLModelConfig, SQLDialect, VisitStack } from '../..';
import { PostgreSQLConnection } from './connection';

@Injectable({
  target: SQLDialect
})
export class PostgreSQLDialect extends SQLDialect {

  conn: PostgreSQLConnection;
  ns: string;

  constructor(context: AsyncContext, public config: SQLModelConfig) {
    super(config.namespace);
    this.conn = new PostgreSQLConnection(context, config);

    Object.assign(this.SQL_OPS, {
      $regex: '~',
      $iregex: '~*'
    });

    this.regexWordBoundary = '\\y';
  }

  hash(value: string) {
    return `encode(digest('${value}', 'sha1'), 'hex')`;
  }

  /**
   * Simple query execution
   */
  async executeSQL<T = any>(query: string): Promise<{ count: number, records: T[] }> {
    (console as any).trace(`\n${'-'.repeat(20)} \nExecuting query\n`, query, '\n', '-'.repeat(20));
    const out = await this.conn.active.query(query);
    return { count: out.rowCount, records: [...out.rows].map(v => ({ ...v })) as any as T[] };
  }

  getModifyColumnSQL(stack: VisitStack[]) {
    const field = stack[stack.length - 1];
    return `ALTER TABLE ${this.namespaceParent(stack)} ALTER COLUMN ${this.getColumnDefinition(field as FieldConfig)};`;
  }
}