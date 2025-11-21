import mongoose from 'mongoose'
import { getMockDatabase } from './db-mock'

const useMocks = process.env.USE_MOCKS === 'true'

let isConnected = false

export async function connectDB() {
  if (useMocks) {
    // Using mock database - no connection needed
    return getMockDatabase()
  }

  if (isConnected) {
    return
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: process.env.MONGODB_DB || 'catalog',
    })

    isConnected = db.connections[0].readyState === 1
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

export { mongoose }
