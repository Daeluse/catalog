import { MongoClient } from 'mongodb'
import { env } from './env'

let clientPromise: Promise<MongoClient>

if (env.useMocks) {
  // If using mocks, export a dummy promise
  const dummyClient = {} as MongoClient
  clientPromise = Promise.resolve(dummyClient)
} else {
  if (!env.mongodbUri) {
    throw new Error('Please add your MongoDB URI to .env.local')
  }

  const uri = env.mongodbUri
  const options = {}

  if (env.isDevelopment) {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    clientPromise = globalWithMongo._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    const client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }
}

// Export a module-scoped MongoClient promise
export default clientPromise
