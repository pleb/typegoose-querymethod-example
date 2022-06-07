import {
  types,
  queryMethod,
  prop,
  getModelForClass,
  DocumentType,
  mongoose
} from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Document, HydratedDocument, Query } from "mongoose";


// Read about query methods here https://typegoose.github.io/typegoose/docs/api/decorators/query-method
// type OmitFirstArgument<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never
// type ArgumentTypes<F extends (...args: any) => any> = OmitFirstArgument<F>

type ParametersRestrictive<F extends Function> = F extends (...args: infer A) => any ? A : never;

type QueryWithHelpersFixed<TDocType, TQueryHelpers, TSearchArgs extends Function | void = void>
  = TSearchArgs extends Function
  ? (...args: ParametersRestrictive<TSearchArgs>) => Query<Array<HydratedDocument<DocumentType<TDocType, TQueryHelpers>, object, object>>, Document<TDocType, TQueryHelpers>>
  : () => Query<Array<HydratedDocument<DocumentType<TDocType, TQueryHelpers>, object, object>>, Document<TDocType, TQueryHelpers>>

interface QueryHelpers {
  findByName: QueryWithHelpersFixed<Person, QueryHelpers, typeof findByName>
  findByMultiArg: QueryWithHelpersFixed<Person, QueryHelpers, typeof findByMultiArg>
  findByNoArg: QueryWithHelpersFixed<Person, QueryHelpers>
  findByNoArg2: QueryWithHelpersFixed<Person, QueryHelpers, typeof findNoArg2>
}

function findByName(this: types.QueryHelperThis<typeof Person, QueryHelpers>, name: string) {
  return this.find({ name })
}

function findByMultiArg(this: types.QueryHelperThis<typeof Person, QueryHelpers>, arg1: string, arg2: number) { return this }

function findByNoArg(this: types.QueryHelperThis<typeof Person, QueryHelpers>) { return this }
function findNoArg2(this: types.QueryHelperThis<typeof Person, QueryHelpers>) { return this }

class Address {
  @prop()
  line1: string

  constructor(line1: string) {
    this.line1 = line1;
  }
}

@queryMethod(findByName)
@queryMethod(findByNoArg)
@queryMethod(findByMultiArg)
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
  const docs = await PersonModel.find().findByName('n1')

  const a = await PersonModel.find().findByNoArg() // should not fail ✅
  const b = await PersonModel.find().findByName('n1') // should not fail ✅
  const c = await PersonModel.find().findByName() // should fail ✅
  const d = await PersonModel.find().findByName('n1', 'b2')  // should fail ✅
  const e = await PersonModel.find().findByName(1) // should fail ✅
  const f = await PersonModel.find().findByMultiArg('n1', 2) // should not fail ✅
  const g = await PersonModel.find().findByNoArg2() // should not fail ✅

  for (let doc of docs) {
    // For when addresses are a sub-doc
    // console.log(doc), (await doc).addresses[0].line2)

    // For when addresses are a mixed type
    // ⚠️ Type error ⚠️
    console.log(doc, doc.addresses[0].line1)
  }

  process.exit(0)
})();
