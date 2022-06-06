import {
    types,
    queryMethod,
    prop,
    getModelForClass,
    mongoose
} from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

interface QueryHelpers {
    findByName: types.AsQueryMethod<typeof findByName>;
}

function findByName(this: types.QueryHelperThis<typeof Person, QueryHelpers>, name: string) {
    return this.find({ name })
}

class Address {
    @prop()
    line1: string
}

@queryMethod(findByName)
class Person {
    @prop()
    public name: string
    @prop()
    public addresses: Address[];
}

(async () => {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect(uri, { dbName: 'test' });

    const PersonModel = getModelForClass<typeof Person,
        QueryHelpers>(Person);

    await PersonModel.create({
        name: 'hello',
        addresses: [
            {
                line1: 'line 1'
            }, {
                line1: 'line 2'
            }
        ]
    });

    const allDocs = await PersonModel.find()

    const docs: types.DocumentType<typeof Person, QueryHelpers>[] = await PersonModel.find().findByName('hello');

    console.log(docs[0].name);
    console.log(allDocs[0].name);
    //console.log(docs[0].addresses[0].line1);
    console.log((docs[0] as any).addresses[0].line1)
    console.log(allDocs[0].addresses[0].line1)
})();
