import {
  types,
  queryMethod,
  prop,
  getModelForClass,
  mongoose
} from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";

// Read about query methods here https://typegoose.github.io/typegoose/docs/api/decorators/query-method

interface QueryHelpers {
  findByName: types.AsQueryMethod<typeof findByName>;
}

function findByName(this: types.QueryHelperThis<typeof Person, QueryHelpers>, name: string) {
  return this.find({ name })
}

class Address {
  @prop()
  line1: string

  constructor(line1: string) {
    this.line1 = line1;
  }
}

@queryMethod(findByName)
class Person {
  @prop()
  public name: string

  // As a sub-doc
  // @prop({ type: () => Address })
  // As a mixed type
  @prop()
  public addresses: Address[];

  constructor(name: string, addresses: Address[]) {
    this.name = name;
    this.addresses = addresses;
  }
}

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, { dbName: 'test' });

  const PersonModel = getModelForClass<typeof Person, QueryHelpers>(Person);

  await PersonModel.create({ name: 'n1', addresses: [{ line1: 'a1' }, { line1: 'a2' }] })
  await PersonModel.create(new Person('n2', [new Address('a3'), new Address('a4')]));

  console.log('👇 Find one lean POJO 👇')
  let pojo = await PersonModel.findOne().lean()
  console.log(pojo, pojo.addresses[0].line1)

  console.log('👇 Find all docs 👇')
  const allDocs =  await PersonModel.find().lean()

  for (let doc of allDocs) {
    // For when addresses are a sub-doc
    // console.log(doc), (await doc).addresses[0].line2)

    // For when addresses are a mixed type
    console.log(doc, doc.addresses[0].line1)
  }

  console.log('👇 Find docs with name of `n1` 👇')
  const docs = await PersonModel.find().findByName('n1');

  for (let doc of docs) {
    // For when addresses are a sub-doc
    // console.log(doc), (await doc).addresses[0].line2)

    // For when addresses are a mixed type
    // ⚠️ Type error ⚠️
    // console.log(doc, doc.addresses[0].line1)
    const docCasted = (doc as any) as mongoose.Document<any, QueryHelpers> & Person & IObjectWithTypegooseFunction & { _id: (mongoose.Document<any, QueryHelpers> & Person & IObjectWithTypegooseFunction)["_id"] }
    console.log(doc, docCasted.addresses[0].line1)
  }

  process.exit(0)
})();
