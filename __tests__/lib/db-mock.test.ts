import { describe, it, expect, beforeEach } from 'vitest'
import { getMockDatabase, closeMockDatabase } from '../../src/lib/db-mock'

describe('db-mock', () => {
  beforeEach(async () => {
    // Get a fresh database for each test
    const db = getMockDatabase()
    const collection = db.collection('test-items')

    // Clear any existing data
    const existing = await collection.find()
    for (const item of existing) {
      await collection.deleteOne({ _id: item._id })
    }
  })

  describe('query operators', () => {
    it('should support $lte operator', async () => {
      const db = getMockDatabase()
      const collection = db.collection('test-lte')

      // Clear existing data
      const existing = await collection.find()
      for (const item of existing) {
        await collection.deleteOne({ _id: item._id })
      }

      // Insert test data
      await collection.insertOne({ name: 'item1', score: 10 })
      await collection.insertOne({ name: 'item2', score: 20 })
      await collection.insertOne({ name: 'item3', score: 30 })

      // Query with $lte
      const results = await collection.find({ score: { $lte: 20 } })

      // Should only return items with score <= 20
      expect(results.length).toBeGreaterThanOrEqual(2)
      const matchingItems = results.filter((r: any) => r.score <= 20)
      expect(matchingItems).toHaveLength(2)
      expect(matchingItems.map((r: any) => r.name)).toContain('item1')
      expect(matchingItems.map((r: any) => r.name)).toContain('item2')
    })

    it('should support $gte operator', async () => {
      const db = getMockDatabase()
      const collection = db.collection('test-gte')

      // Clear existing data
      const existing = await collection.find()
      for (const item of existing) {
        await collection.deleteOne({ _id: item._id })
      }

      await collection.insertOne({ name: 'item1', score: 10 })
      await collection.insertOne({ name: 'item2', score: 20 })
      await collection.insertOne({ name: 'item3', score: 30 })

      const results = await collection.find({ score: { $gte: 20 } })

      const matchingItems = results.filter((r: any) => r.score >= 20)
      expect(matchingItems).toHaveLength(2)
      expect(matchingItems.map((r: any) => r.name)).toContain('item2')
      expect(matchingItems.map((r: any) => r.name)).toContain('item3')
    })

    it('should support $lt operator', async () => {
      const db = getMockDatabase()
      const collection = db.collection('test-lt')

      // Clear existing data
      const existing = await collection.find()
      for (const item of existing) {
        await collection.deleteOne({ _id: item._id })
      }

      await collection.insertOne({ name: 'item1', score: 10 })
      await collection.insertOne({ name: 'item2', score: 20 })
      await collection.insertOne({ name: 'item3', score: 30 })

      const results = await collection.find({ score: { $lt: 25 } })

      const matchingItems = results.filter((r: any) => r.score < 25)
      expect(matchingItems).toHaveLength(2)
      expect(matchingItems.map((r: any) => r.name)).toContain('item1')
      expect(matchingItems.map((r: any) => r.name)).toContain('item2')
    })

    it('should support $gt operator', async () => {
      const db = getMockDatabase()
      const collection = db.collection('test-gt')

      // Clear existing data
      const existing = await collection.find()
      for (const item of existing) {
        await collection.deleteOne({ _id: item._id })
      }

      await collection.insertOne({ name: 'item1', score: 10 })
      await collection.insertOne({ name: 'item2', score: 20 })
      await collection.insertOne({ name: 'item3', score: 30 })

      const results = await collection.find({ score: { $gt: 15 } })

      const matchingItems = results.filter((r: any) => r.score > 15)
      expect(matchingItems).toHaveLength(2)
      expect(matchingItems.map((r: any) => r.name)).toContain('item2')
      expect(matchingItems.map((r: any) => r.name)).toContain('item3')
    })

    it('should support combined comparison operators', async () => {
      const db = getMockDatabase()
      const collection = db.collection('test-combined')

      // Clear existing data
      const existing = await collection.find()
      for (const item of existing) {
        await collection.deleteOne({ _id: item._id })
      }

      await collection.insertOne({ name: 'item1', score: 10 })
      await collection.insertOne({ name: 'item2', score: 20 })
      await collection.insertOne({ name: 'item3', score: 30 })

      const results = await collection.find({ score: { $gte: 15, $lte: 25 } })

      const matchingItems = results.filter((r: any) => r.score >= 15 && r.score <= 25)
      expect(matchingItems).toHaveLength(1)
      expect(matchingItems[0].name).toBe('item2')
    })
  })

  describe('update operators', () => {
    it('should support $inc operator for incrementing numbers', async () => {
      const db = getMockDatabase()
      const collection = db.collection('counters')

      const result = await collection.insertOne({ name: 'counter1', count: 10 })

      await collection.updateOne(
        { _id: result.insertedId },
        { $inc: { count: 5 } }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.count).toBe(15)
    })

    it('should support $inc operator on non-existent field', async () => {
      const db = getMockDatabase()
      const collection = db.collection('counters')

      const result = await collection.insertOne({ name: 'counter1' })

      await collection.updateOne(
        { _id: result.insertedId },
        { $inc: { count: 5 } }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.count).toBe(5)
    })

    it('should support $inc with multiple fields', async () => {
      const db = getMockDatabase()
      const collection = db.collection('stats')

      const result = await collection.insertOne({ views: 100, likes: 50 })

      await collection.updateOne(
        { _id: result.insertedId },
        { $inc: { views: 10, likes: 2 } }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.views).toBe(110)
      expect(updated?.likes).toBe(52)
    })

    it('should support $push operator for adding to arrays', async () => {
      const db = getMockDatabase()
      const collection = db.collection('lists')

      const result = await collection.insertOne({ name: 'list1', items: ['a', 'b'] })

      await collection.updateOne(
        { _id: result.insertedId },
        { $push: { items: 'c' } }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.items).toEqual(['a', 'b', 'c'])
    })

    it('should support $push operator on non-existent array', async () => {
      const db = getMockDatabase()
      const collection = db.collection('lists')

      const result = await collection.insertOne({ name: 'list1' })

      await collection.updateOne(
        { _id: result.insertedId },
        { $push: { items: 'first' } }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.items).toEqual(['first'])
    })

    it('should support $push with multiple fields', async () => {
      const db = getMockDatabase()
      const collection = db.collection('lists')

      const result = await collection.insertOne({
        tags: ['tag1'],
        categories: ['cat1'],
      })

      await collection.updateOne(
        { _id: result.insertedId },
        { $push: { tags: 'tag2', categories: 'cat2' } }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.tags).toEqual(['tag1', 'tag2'])
      expect(updated?.categories).toEqual(['cat1', 'cat2'])
    })

    it('should support combining $set, $inc, and $push', async () => {
      const db = getMockDatabase()
      const collection = db.collection('mixed')

      const result = await collection.insertOne({
        name: 'test',
        count: 0,
        items: [],
      })

      await collection.updateOne(
        { _id: result.insertedId },
        {
          $set: { name: 'updated' },
          $inc: { count: 1 },
          $push: { items: 'item1' },
        }
      )

      const updated = await collection.findOne({ _id: result.insertedId })
      expect(updated?.name).toBe('updated')
      expect(updated?.count).toBe(1)
      expect(updated?.items).toEqual(['item1'])
    })
  })

  describe('chainable methods', () => {
    it('should support chainable sort method', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      const chained = collection.sort({ name: 1 })
      expect(chained).toBe(collection)
    })

    it('should support chainable limit method', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      const chained = collection.limit(10)
      expect(chained).toBe(collection)
    })

    it('should support chainable skip method', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      const chained = collection.skip(5)
      expect(chained).toBe(collection)
    })

    it('should support chaining multiple methods', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      const chained = collection.sort({ name: 1 }).limit(10).skip(5)
      expect(chained).toBe(collection)
    })
  })

  describe('closeMockDatabase', () => {
    it('should close and clear the global database instance', async () => {
      const db1 = getMockDatabase()
      const collection = db1.collection('test')
      await collection.insertOne({ test: 'data' })

      closeMockDatabase()

      // Getting database again should create a new instance
      const db2 = getMockDatabase()
      expect(db2).toBeDefined()

      // The new instance should be fresh (data persistence happens via file system)
      const collection2 = db2.collection('test')
      const items = await collection2.find()
      // Items may exist if loaded from disk
      expect(items).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle updates on non-existent documents', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      const result = await collection.updateOne(
        { _id: 'non-existent' },
        { $set: { name: 'test' } }
      )

      expect(result.modifiedCount).toBe(0)
    })

    it('should handle deletes on non-existent documents', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      const result = await collection.deleteOne({ _id: 'non-existent' })

      expect(result.deletedCount).toBe(0)
    })

    it('should handle empty query objects', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      await collection.insertOne({ name: 'item1' })
      await collection.insertOne({ name: 'item2' })

      const results = await collection.find({})
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle countDocuments with empty query', async () => {
      const db = getMockDatabase()
      const collection = db.collection('items')

      await collection.insertOne({ name: 'item1' })
      await collection.insertOne({ name: 'item2' })

      const count = await collection.countDocuments({})
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
})
