/**
 * CR-SQLite 约束检查器
 * 
 * 由于 CR-SQLite 不支持以下数据库约束：
 * 1. UNIQUE 约束（除主键外）
 * 2. FOREIGN KEY 约束检查
 * 
 * 需要在应用层实现这些约束逻辑，确保数据完整性
 */

import type Database from 'better-sqlite3'

export interface ConstraintError {
  type: 'unique' | 'foreign_key' | 'not_null'
  table: string
  field: string
  message: string
  value?: any
}

export class CRSQLiteConstraints {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * 检查唯一性约束
   * 在插入或更新数据前调用
   */
  async checkUnique(
    table: string,
    field: string,
    value: any,
    excludeId?: string
  ): Promise<ConstraintError | null> {
    if (!value) {
      return null // 空值不检查唯一性
    }

    try {
      let sql = `SELECT id FROM ${table} WHERE ${field} = ?`
      const params: any[] = [value]

      // 如果是更新操作，排除当前记录
      if (excludeId) {
        sql += ` AND id != ?`
        params.push(excludeId)
      }

      const result = this.db.prepare(sql).get(...params)

      if (result) {
        return {
          type: 'unique',
          table,
          field,
          message: `${field} '${value}' already exists in ${table}`,
          value
        }
      }

      return null
    } catch (error) {
      console.error('[Constraints] Unique check error:', error)
      throw error
    }
  }

  /**
   * 检查外键约束
   * 确保引用的记录存在
   */
  async checkForeignKey(
    foreignTable: string,
    foreignId: string,
    localTable: string,
    localField: string
  ): Promise<ConstraintError | null> {
    if (!foreignId) {
      return null // 空值不检查（如果允许 NULL）
    }

    try {
      const sql = `SELECT id FROM ${foreignTable} WHERE id = ?`
      const result = this.db.prepare(sql).get(foreignId)

      if (!result) {
        return {
          type: 'foreign_key',
          table: localTable,
          field: localField,
          message: `Referenced ${foreignTable} with id '${foreignId}' does not exist`,
          value: foreignId
        }
      }

      return null
    } catch (error) {
      console.error('[Constraints] Foreign key check error:', error)
      throw error
    }
  }

  /**
   * 检查级联删除影响
   * 在删除记录前检查是否有依赖的子记录
   */
  async checkCascadeDelete(
    table: string,
    id: string
  ): Promise<{ table: string; count: number }[]> {
    const dependencies: { table: string; count: number }[] = []

    try {
      // 定义表之间的依赖关系
      const cascadeRules: Record<string, Array<{ table: string; field: string }>> = {
        authors: [
          { table: 'works', field: 'author_id' },
          { table: 'chapters', field: 'author_id' },
          { table: 'contents', field: 'author_id' }
        ],
        works: [
          { table: 'chapters', field: 'work_id' },
          { table: 'contents', field: 'work_id' },
          { table: 'collaborative_documents', field: 'work_id' }
        ],
        chapters: [
          { table: 'chapters', field: 'parent_id' }, // 子章节
          { table: 'contents', field: 'chapter_id' }
        ],
        contents: [
          { table: 'content_versions', field: 'content_id' },
          { table: 'collaborative_documents', field: 'content_id' }
        ]
      }

      const rules = cascadeRules[table]
      if (!rules) {
        return dependencies
      }

      for (const rule of rules) {
        const sql = `SELECT COUNT(*) as count FROM ${rule.table} WHERE ${rule.field} = ?`
        const result = this.db.prepare(sql).get(id) as { count: number }
        
        if (result.count > 0) {
          dependencies.push({
            table: rule.table,
            count: result.count
          })
        }
      }

      return dependencies
    } catch (error) {
      console.error('[Constraints] Cascade delete check error:', error)
      throw error
    }
  }

  /**
   * 执行级联删除
   * 递归删除所有依赖的子记录
   */
  async cascadeDelete(table: string, id: string): Promise<void> {
    const cascadeRules: Record<string, Array<{ table: string; field: string }>> = {
      authors: [
        { table: 'content_versions', field: 'author_id' }, // 先删除孙子
        { table: 'contents', field: 'author_id' },
        { table: 'chapters', field: 'author_id' },
        { table: 'works', field: 'author_id' }
      ],
      works: [
        { table: 'content_versions', field: 'content_id' }, // 通过 contents 间接
        { table: 'collaborative_documents', field: 'work_id' },
        { table: 'contents', field: 'work_id' },
        { table: 'chapters', field: 'work_id' }
      ],
      chapters: [
        { table: 'content_versions', field: 'content_id' },
        { table: 'contents', field: 'chapter_id' },
        { table: 'chapters', field: 'parent_id' } // 递归删除子章节
      ],
      contents: [
        { table: 'collaborative_documents', field: 'content_id' },
        { table: 'content_versions', field: 'content_id' }
      ]
    }

    const rules = cascadeRules[table]
    if (!rules) {
      return
    }

    try {
      for (const rule of rules) {
        // 如果是递归删除（如子章节），需要先获取所有子记录的ID
        if (rule.table === table) {
          const childIds = this.db
            .prepare(`SELECT id FROM ${rule.table} WHERE ${rule.field} = ?`)
            .all(id) as Array<{ id: string }>

          for (const child of childIds) {
            await this.cascadeDelete(rule.table, child.id) // 递归删除
          }
        }

        // 删除依赖记录
        this.db
          .prepare(`DELETE FROM ${rule.table} WHERE ${rule.field} = ?`)
          .run(id)
      }
    } catch (error) {
      console.error('[Constraints] Cascade delete error:', error)
      throw error
    }
  }

  /**
   * 批量检查唯一性约束
   * 用于创建记录时检查多个唯一字段
   */
  async checkMultipleUnique(
    table: string,
    fields: Record<string, any>,
    excludeId?: string
  ): Promise<ConstraintError[]> {
    const errors: ConstraintError[] = []

    // 定义每个表的唯一字段
    const uniqueFields: Record<string, string[]> = {
      authors: ['username', 'email']
      // 其他表根据需要添加
    }

    const tableUniqueFields = uniqueFields[table] || []

    for (const field of tableUniqueFields) {
      const value = fields[field]
      if (value) {
        const error = await this.checkUnique(table, field, value, excludeId)
        if (error) {
          errors.push(error)
        }
      }
    }

    return errors
  }

  /**
   * 批量检查外键约束
   * 用于创建/更新记录时检查所有外键引用
   */
  async checkMultipleForeignKeys(
    table: string,
    fields: Record<string, any>
  ): Promise<ConstraintError[]> {
    const errors: ConstraintError[] = []

    // 定义每个表的外键关系
    const foreignKeys: Record<string, Array<{ field: string; table: string }>> = {
      works: [
        { field: 'author_id', table: 'authors' }
      ],
      chapters: [
        { field: 'work_id', table: 'works' },
        { field: 'parent_id', table: 'chapters' },
        { field: 'author_id', table: 'authors' }
      ],
      contents: [
        { field: 'work_id', table: 'works' },
        { field: 'chapter_id', table: 'chapters' },
        { field: 'author_id', table: 'authors' },
        { field: 'last_editor_id', table: 'authors' }
      ],
      content_versions: [
        { field: 'content_id', table: 'contents' },
        { field: 'author_id', table: 'authors' }
      ],
      collaborative_documents: [
        { field: 'content_id', table: 'contents' },
        { field: 'work_id', table: 'works' }
      ]
    }

    const tableForeignKeys = foreignKeys[table] || []

    for (const fk of tableForeignKeys) {
      const value = fields[fk.field]
      if (value && value !== '') { // 检查非空值
        const error = await this.checkForeignKey(
          fk.table,
          value,
          table,
          fk.field
        )
        if (error) {
          errors.push(error)
        }
      }
    }

    return errors
  }

  /**
   * 完整的数据验证
   * 在插入或更新前调用，检查所有约束
   */
  async validateData(
    table: string,
    data: Record<string, any>,
    excludeId?: string
  ): Promise<ConstraintError[]> {
    const errors: ConstraintError[] = []

    // 检查唯一性约束
    const uniqueErrors = await this.checkMultipleUnique(table, data, excludeId)
    errors.push(...uniqueErrors)

    // 检查外键约束
    const fkErrors = await this.checkMultipleForeignKeys(table, data)
    errors.push(...fkErrors)

    return errors
  }
}

/**
 * 约束错误类
 * 用于抛出约束违反异常
 */
export class ConstraintViolationError extends Error {
  public errors: ConstraintError[]

  constructor(errors: ConstraintError[]) {
    const messages = errors.map(e => e.message).join('; ')
    super(`Constraint violation: ${messages}`)
    this.name = 'ConstraintViolationError'
    this.errors = errors
  }
}
