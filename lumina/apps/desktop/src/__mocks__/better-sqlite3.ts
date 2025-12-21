/**
 * Mock for better-sqlite3
 *
 * Provides an in-memory mock implementation for unit testing
 * without requiring the native SQLite binary.
 */

interface MockStatement {
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number }
  get: (...params: unknown[]) => unknown
  all: (...params: unknown[]) => unknown[]
}

interface IMockDatabase {
  exec: (sql: string) => void
  prepare: (sql: string) => MockStatement
  pragma: (pragma: string) => unknown
  close: () => void
}

// In-memory storage for mock database
const tables: Map<string, unknown[]> = new Map()
let autoIncrementId = 1

function parseInsertValues(sql: string, params: unknown[]): Record<string, unknown> {
  // Very simplified SQL parsing for INSERT statements
  const match = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i)
  if (!match) return {}

  const tableName = match[1]
  const columns = match[2].split(',').map(c => c.trim())
  const values: Record<string, unknown> = { id: autoIncrementId++ }

  columns.forEach((col, idx) => {
    if (params[idx] !== undefined) {
      values[col] = params[idx]
    }
  })

  if (!tables.has(tableName)) {
    tables.set(tableName, [])
  }
  tables.get(tableName)!.push(values)

  return values
}

function mockPrepare(sql: string): MockStatement {
  const sqlLower = sql.toLowerCase().trim()

  return {
    run: (...params: unknown[]) => {
      if (sqlLower.includes('insert')) {
        parseInsertValues(sql, params)
        return { changes: 1, lastInsertRowid: autoIncrementId - 1 }
      }
      if (sqlLower.includes('update')) {
        // Handle UPDATE - simplified
        return { changes: 1, lastInsertRowid: 0 }
      }
      if (sqlLower.includes('delete')) {
        // Handle DELETE - simplified
        return { changes: 1, lastInsertRowid: 0 }
      }
      return { changes: 0, lastInsertRowid: 0 }
    },

    get: (...params: unknown[]) => {
      if (sqlLower.includes('from user_baseline')) {
        const baseline = tables.get('user_baseline')?.[0]
        if (baseline) return baseline
        return {
          id: 1,
          blink_p25: null,
          blink_p50: null,
          blink_p75: null,
          calibrated_at: null,
          samples_count: 0,
        }
      }
      if (sqlLower.includes('count(*)')) {
        // Return mock count
        const tableName = sql.match(/from\s+(\w+)/i)?.[1] || ''
        const data = tables.get(tableName) || []
        let filtered = data

        // Simple filtering for is_blink = 1
        if (sqlLower.includes('is_blink = 1')) {
          filtered = data.filter((row: any) => row.is_blink === 1)
        }

        // Filter by timestamp if needed
        if (sqlLower.includes('timestamp >=') && params[0] !== undefined) {
          filtered = filtered.filter((row: any) => row.timestamp >= (params[0] as number))
        }

        return { count: filtered.length }
      }
      if (sqlLower.includes('avg(')) {
        const tableName = sql.match(/from\s+(\w+)/i)?.[1] || ''
        const data = tables.get(tableName) || []
        let filtered = data

        if (params[0] !== undefined && sqlLower.includes('timestamp >=')) {
          filtered = filtered.filter((row: any) => row.timestamp >= (params[0] as number))
        }

        const avgEars = filtered
          .map((row: any) => row.avg_ear)
          .filter((v: any) => v !== null && v !== undefined)
        const avgEar = avgEars.length > 0
          ? avgEars.reduce((a: number, b: number) => a + b, 0) / avgEars.length
          : null

        return { avg_ear: avgEar, count: filtered.length }
      }
      return null
    },

    all: (...params: unknown[]) => {
      if (sqlLower.includes('from minute_rollups')) {
        const data = tables.get('minute_rollups') || []
        let filtered = [...data]

        // Handle synced = 0 filter
        if (sqlLower.includes('synced = 0')) {
          filtered = filtered.filter((row: any) => row.synced === 0)
        }

        // Handle timestamp range
        if (sqlLower.includes('timestamp >=') && sqlLower.includes('timestamp <=')) {
          const startTime = params[0] as number
          const endTime = params[1] as number
          filtered = filtered.filter((row: any) =>
            row.timestamp >= startTime && row.timestamp <= endTime
          )
        }

        // Sort by timestamp ASC
        filtered.sort((a: any, b: any) => a.timestamp - b.timestamp)

        // Handle LIMIT
        if (sqlLower.includes('limit') && params.length > 0) {
          const limitParam = params[params.length - 1] as number
          if (typeof limitParam === 'number') {
            filtered = filtered.slice(0, limitParam)
          }
        }

        return filtered
      }
      return []
    },
  }
}

class MockDatabase implements IMockDatabase {
  private closed = false

  constructor(_filename: string, _options?: unknown) {
    // Reset state for each new database instance
    tables.clear()
    autoIncrementId = 1
  }

  exec(sql: string): void {
    if (this.closed) return

    // Handle CREATE TABLE
    if (sql.toLowerCase().includes('create table')) {
      const match = sql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/i)
      if (match) {
        const tableName = match[1]
        if (!tables.has(tableName)) {
          tables.set(tableName, [])
        }
      }
    }

    // Handle INSERT OR IGNORE for user_baseline
    if (sql.toLowerCase().includes('insert or ignore into user_baseline')) {
      if (!tables.has('user_baseline')) {
        tables.set('user_baseline', [])
      }
      const existing = tables.get('user_baseline')!
      if (existing.length === 0) {
        existing.push({
          id: 1,
          blink_p25: null,
          blink_p50: null,
          blink_p75: null,
          calibrated_at: null,
          samples_count: 0,
        })
      }
    }
  }

  prepare(sql: string): MockStatement {
    if (this.closed) {
      return {
        run: () => ({ changes: 0, lastInsertRowid: 0 }),
        get: () => null,
        all: () => [],
      }
    }
    return mockPrepare(sql)
  }

  pragma(_pragma: string): unknown {
    return null
  }

  close(): void {
    this.closed = true
  }
}

export default MockDatabase
