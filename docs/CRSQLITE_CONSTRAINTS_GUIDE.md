# CR-SQLite 约束处理方案

## 问题背景

CR-SQLite 不支持以下数据库约束：
1. **UNIQUE 约束**（除主键外）- 在分布式 CRDT 环境中会导致冲突
2. **FOREIGN KEY 约束检查** - 在复制过程中可能违反引用完整性

## 解决方案：应用层约束检查

### 1. 约束检查器：`CRSQLiteConstraints`

已创建 `src/data/crsqlite/CRSQLiteConstraints.ts`，提供以下功能：

#### 核心方法

```typescript
// 1. 检查唯一性
await constraints.checkUnique('authors', 'username', 'testuser', excludeId?)

// 2. 检查外键存在性
await constraints.checkForeignKey('authors', authorId, 'works', 'author_id')

// 3. 完整数据验证（推荐）
const errors = await constraints.validateData('authors', userData, excludeId?)
if (errors.length > 0) {
  throw new ConstraintViolationError(errors)
}
```

### 2. 在 Repository 中使用

#### 示例 1: 创建记录（检查唯一性和外键）

```typescript
// CRSQLiteUserRepository.create()
async create(userData: any): Promise<any> {
  const id = this.generateId();
  const data = {
    id,
    username: userData.username,
    email: userData.email,
    // ... 其他字段
  };

  // ✅ 检查唯一性约束（username, email）
  const errors = await this.constraints.validateData('authors', data);
  if (errors.length > 0) {
    throw new ConstraintViolationError(errors);
  }

  // 执行插入
  this.run(insertSql, params);
  return await this.findById(id);
}
```

#### 示例 2: 更新记录（排除当前记录）

```typescript
// CRSQLiteUserRepository.update()
async update(id: string, updateData: any): Promise<any> {
  // ✅ 检查唯一性（排除当前记录）
  const errors = await this.constraints.validateData('authors', updateData, id);
  if (errors.length > 0) {
    throw new ConstraintViolationError(errors);
  }

  // 执行更新
  this.run(updateSql, params);
  return await this.findById(id);
}
```

#### 示例 3: 创建关联记录（检查外键）

```typescript
// CRSQLiteWorkRepository.create()
async create(workData: any): Promise<any> {
  const data = {
    id: this.generateId(),
    title: workData.title,
    author_id: workData.authorId,
    // ... 其他字段
  };

  // ✅ 检查外键：author 必须存在
  const fkError = await this.constraints.checkForeignKey(
    'authors',
    data.author_id,
    'works',
    'author_id'
  );
  if (fkError) {
    throw new ConstraintViolationError([fkError]);
  }

  // 或者使用批量验证（推荐）
  const errors = await this.constraints.validateData('works', data);
  if (errors.length > 0) {
    throw new ConstraintViolationError(errors);
  }

  this.run(insertSql, params);
  return await this.findById(data.id);
}
```

#### 示例 4: 级联删除

```typescript
// CRSQLiteWorkRepository.delete()
async delete(id: string): Promise<void> {
  // ✅ 检查依赖关系
  const dependencies = await this.constraints.checkCascadeDelete('works', id);
  
  if (dependencies.length > 0) {
    console.log('[CRSQLite] Cascade delete:', dependencies);
    // { table: 'chapters', count: 5 }
    // { table: 'contents', count: 20 }
  }

  // ✅ 执行级联删除
  await this.constraints.cascadeDelete('works', id);

  // 删除主记录
  this.run('DELETE FROM works WHERE id = ?', [id]);
}
```

### 3. 约束配置

已预定义的约束规则：

#### 唯一性约束
```typescript
const uniqueFields = {
  authors: ['username', 'email'],
  // 其他表可以在这里添加
};
```

#### 外键关系
```typescript
const foreignKeys = {
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
  // ... 其他表
};
```

#### 级联删除规则
```typescript
const cascadeRules = {
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
  // ... 其他表
};
```

### 4. 错误处理

#### 捕获约束错误

```typescript
import { ConstraintViolationError } from './CRSQLiteConstraints';

try {
  await userRepo.create({ username: 'existing-user' });
} catch (error) {
  if (error instanceof ConstraintViolationError) {
    console.error('Constraint violations:', error.errors);
    // [
    //   {
    //     type: 'unique',
    //     table: 'authors',
    //     field: 'username',
    //     message: "username 'existing-user' already exists in authors",
    //     value: 'existing-user'
    //   }
    // ]
  }
}
```

#### 在 IPC 层处理

```typescript
// src/ipc/user-handlers.ts
ipcMain.handle('user:create', async (event, userData) => {
  try {
    const user = await userRepository.create(userData);
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof ConstraintViolationError) {
      return {
        success: false,
        error: 'Validation failed',
        violations: error.errors.map(e => ({
          field: e.field,
          message: e.message
        }))
      };
    }
    return { success: false, error: error.message };
  }
});
```

### 5. 性能考虑

#### 批量操作优化

```typescript
// ❌ 低效：每条记录单独检查
for (const user of users) {
  await constraints.validateData('authors', user);
  // 插入...
}

// ✅ 优化：使用事务
this.transaction(() => {
  for (const user of users) {
    // 在事务中批量检查和插入
    const errors = await constraints.validateData('authors', user);
    if (errors.length === 0) {
      this.run(insertSql, params);
    }
  }
});
```

#### 索引优化

由于需要频繁查询唯一性和外键，确保相关字段有索引：

```sql
-- 已在 CRSQLiteManager.createTables() 中创建
CREATE INDEX idx_authors_username ON authors(username);
CREATE INDEX idx_authors_email ON authors(email);
CREATE INDEX idx_works_author ON works(author_id);
CREATE INDEX idx_chapters_work ON chapters(work_id);
-- ... 等
```

### 6. 测试约束

```typescript
// 测试唯一性约束
describe('CRSQLiteConstraints', () => {
  it('should detect duplicate username', async () => {
    await userRepo.create({ username: 'test' });
    
    const errors = await constraints.validateData('authors', {
      username: 'test'
    });
    
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('unique');
    expect(errors[0].field).toBe('username');
  });

  it('should detect missing foreign key', async () => {
    const error = await constraints.checkForeignKey(
      'authors',
      'non-existent-id',
      'works',
      'author_id'
    );
    
    expect(error).not.toBeNull();
    expect(error.type).toBe('foreign_key');
  });

  it('should cascade delete', async () => {
    const work = await workRepo.create({ authorId: author.id });
    await chapterRepo.create({ workId: work.id });
    
    await constraints.cascadeDelete('works', work.id);
    
    const chapters = await chapterRepo.findByWork(work.id);
    expect(chapters).toHaveLength(0);
  });
});
```

## 总结

### 优势
✅ **完全控制**：在应用层精确控制约束逻辑  
✅ **灵活性**：可以根据业务需求自定义约束规则  
✅ **调试性**：约束违反时提供详细错误信息  
✅ **CRDT 兼容**：不会干扰 CR-SQLite 的 CRDT 复制机制  

### 注意事项
⚠️ **性能**：需要额外的查询来检查约束（已通过索引优化）  
⚠️ **一致性**：在分布式环境中，唯一性约束可能在不同节点上同时违反（需要 CRDT 冲突解决策略）  
⚠️ **维护**：需要手动维护约束配置（但更灵活）  

### 分布式环境的特殊考虑

在 P2P 同步场景中：
1. **唯一性冲突**：可能在不同设备上同时创建相同 username
   - 解决方案：使用 CRDT 的 "last-write-wins" 或自定义冲突解决策略
   - 或在 username 中加入 device_id 作为后缀

2. **外键一致性**：父记录可能在子记录之后到达
   - 解决方案：使用延迟验证，或接受"最终一致性"

3. **级联删除**：删除操作在同步时的顺序问题
   - 解决方案：使用 soft delete（标记删除而不是物理删除）
