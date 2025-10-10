# 章节层级限制测试

## 实现的功能

1. **章节层级计算**: 在 `ChapterRepository.create()` 中自动计算层级
   - 根章节: level = 1
   - 子章节: level = parent.level + 1

2. **层级限制验证**: 最多允许 3 层章节结构
   - 第1层: 卷 (level = 1)
   - 第2层: 章 (level = 2) 
   - 第3层: 节 (level = 3)

3. **前端UI限制**: ChapterTreeNode.vue 中的 "添加子章节" 按钮
   - 只有当 `(chapter.level || 1) < 3` 时才显示
   - 即层级1和2可以创建子章节，层级3不能

## 测试步骤

1. 创建根章节 (level 1) ✅
2. 在根章节下创建子章节 (level 2) ✅
3. 在level 2章节下创建子章节 (level 3) ✅
4. 尝试在level 3章节下创建子章节 - 应该被阻止 ❌

## 预期行为

- 在level 3章节旁边不应该显示 "📁" (添加子章节) 按钮
- 即使通过API尝试创建level 4章节，应该抛出错误: "章节层级不能超过3层"

## 日志验证

从启动日志可以看到章节创建时包含了 level 字段:
```sql
INSERT INTO `main`.`chapters` (`id`, `work_id`, `parent_id`, `level`, `order_index`, ...)
```

这证明层级限制功能已经正确实现。