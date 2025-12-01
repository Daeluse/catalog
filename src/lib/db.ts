import mongoose from 'mongoose'
import { getMockDatabase } from './db-mock'
import { env } from './env'

let isConnected = false

export async function connectDB() {
  if (env.useMocks) {
    // Using mock database - no connection needed
    return getMockDatabase()
  }

  if (isConnected) {
    return
  }

  try {
    const db = await mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDb,
    })

    isConnected = db.connections[0].readyState === 1
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

export { mongoose }
