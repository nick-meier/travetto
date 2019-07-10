import { FieldConfig, BindUtil } from '@travetto/schema';
import { Injectable } from '@travetto/di';
import { AsyncContext } from '@travetto/context';
import { Class } from '@travetto/registry';
import { Query, WhereClause } from '@travetto/model';

import { SQLModelConfig, SQLDialect, VisitStack } from '../..';
import { MySQLConnection } from './connection';

@Injectable({
  target: SQLDialect
})
export class MySQLDialect extends SQLDialect {

  conn: MySQLConnection;
  tablePostfix = `COLLATE='utf8mb4_unicode_ci' ENGINE=InnoDB`;
  ns: string;

  constructor(context: AsyncContext, public config: SQLModelConfig) {
    super();
    this.conn = new MySQLConnection(context, config);
    this.ns = config.namespace;

    Object.assign(this.SQL_OPS, {
      $regex: 'REGEXP BINARY',
      $iregex: 'REGEXP'
    });
  }

  hash(value: string) {
    return `SHA2('${value}', ${this.KEY_LEN * 4})`;
  }

  getCreateTableSQL(stack: VisitStack[]) {
    return super.getCreateTableSQL(stack).replace(/[)];$/, `) ${this.tablePostfix};`);
  }

  /**
   * FieldConfig to MySQL Column definition
   */
  getColumnDefinition(conf: FieldConfig) {
    let type: string = '';

    if (conf.type === Number) {
      type = 'INT';
      if (conf.precision) {
        const [digits, decimals] = conf.precision;
        if (decimals) {
          type = `DECIMAL(${digits}, ${decimals})`;
        } else if (digits) {
          if (digits < 3) {
            type = 'TINYINT';
          } else if (digits < 5) {
            type = 'SMALLINT';
          } else if (digits < 7) {
            type = 'MEDIUMINIT';
          } else if (digits < 10) {
            type = 'INT';
          } else {
            type = 'BIGINT';
          }
        }
      } else {
        type = 'INTEGER';
      }
    } else if (conf.type === Date) {
      type = 'DATETIME';
    } else if (conf.type === Boolean) {
      type = 'BOOL';
    } else if (conf.type === String) {
      if (conf.specifier && conf.specifier.startsWith('text')) {
        type = 'TEXT';
      } else {
        type = `NVARCHAR(${conf.maxlength ? conf.maxlength.n : 1024})`;
      }
    }

    if (!type) {
      return '';
    }

    return `${conf.name} ${type} ${(conf.required && conf.required.active) ? 'NOT NULL' : 'DEFAULT NULL'}`;
  }

  /**
   * Convert value to SQL valid representation
   */
  resolveValue(conf: FieldConfig, value: any) {
    if (value === undefined || value === null) {
      return 'NULL';
    } else if (conf.type === String) {
      if (value instanceof RegExp) {
        let src = BindUtil.extractRegex(value).source.replace(/\\b/g, '([[:<:]]|[[:>:]])');
        return `'${src}'`;
      } else {
        return `'${value}'`;
      }
    } else if (conf.type === Boolean) {
      return `${value ? 'TRUE' : 'FALSE'}`;
    } else if (conf.type === Number) {
      return `${value}`;
    } else if (conf.type === Date) {
      const [day, time] = (value as Date).toISOString().split(/[T.]/);
      return `'${day} ${time}'`;
    }
    throw new Error('Ruh roh?');
  }

  /**
   * Simple query execution
   */
  async executeSQL<T = any>(query: string): Promise<{ count: number, records: T[] }> {
    return new Promise<{ count: number, records: T[] }>((res, rej) => {
      (console as any).trace(`\n${'-'.repeat(20)} \nExecuting query\n`, query, '\n', '-'.repeat(20));
      this.conn.active.query(query, (err, results, fields) => {
        if (err) {
          console.debug(err);
          rej(err);
        } else {
          const records = Array.isArray(results) ? [...results].map(v => ({ ...v })) : [{ ...results }] as T[];
          res({ records, count: results.affectedRows });
        }
      });
    });
  }

  getDeleteSQL(stack: VisitStack[], where?: WhereClause<any>) {
    const sql = super.getDeleteSQL(stack, where);
    return sql.replace(/\bDELETE\b/g, `DELETE ${this.rootAlias}`);
  }

  getLimitSQL<T>(cls: Class<T>, query?: Query<T>): string {
    return !query || (!query.limit && !query.offset) ?
      '' :
      `LIMIT ${query.offset || 0}, ${query.limit}`;
  }
}