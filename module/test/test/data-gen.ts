import { Suite, Test, BeforeAll } from '../src/decorator';

import { GenerateSchemaData } from '../support/extension.schema';
import { Schema, SchemaRegistry } from '@travetto/schema';

import * as assert from 'assert';

@Schema()
class Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  country: string;
}

@Schema()
class User {
  fName: string;
  lName: string;
  email: string;
  phone: string;
  dob?: Date;

  address: Address;
}

@Suite()
class DataGenerationSuite {

  @BeforeAll()
  async init() {
    await SchemaRegistry.init();
  }

  @Test()
  verifyValueGen() {
    const user = GenerateSchemaData.generate(User);

    assert.ok(user);
  }
}