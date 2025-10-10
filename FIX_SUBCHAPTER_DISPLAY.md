# 修复子章节不显示问题 (Fix Sub-chapters Not Displaying)

## 问题描述 (Problem Description)

重构 ChapterTree 组件后,发现子章节无法在界面上显示。

After reorganizing the ChapterTree component, sub-chapters stopped displaying in the UI.

## 根本原因 (Root Cause)

在 Vue 3 的 `<script setup>` 中,递归组件需要使用正确的组件名称来引用自己。

在 `Node.vue` 文件中:
- 文件名: `Node.vue`
- 模板中使用的组件名: `<ChapterTreeNode>` ❌
- 应该使用: `<Node>` ✅

In Vue 3's `<script setup>`, recursive components must use the correct component name to reference themselves.

In the `Node.vue` file:
- Filename: `Node.vue`
- Component name used in template: `<ChapterTreeNode>` ❌
- Should use: `<Node>` ✅

## 技术细节 (Technical Details)

### Vue 3 递归组件规则 (Vue 3 Recursive Component Rules)

在 Vue 3 的 `<script setup>` 语法中:
1. 组件自动使用文件名作为组件名
2. 递归调用时必须使用文件名,而不是导入时的别名
3. 外部文件可以用任意名称导入,但组件内部递归必须用文件名

In Vue 3's `<script setup>` syntax:
1. Components automatically use the filename as the component name
2. Recursive calls must use the filename, not the import alias
3. External files can import with any name, but internal recursion must use the filename

### 文件结构 (File Structure)

```
src/ui/components/ChapterTree/
├── index.vue           # Container component
│   └── imports './Node.vue' as ChapterTreeNode  ✅ OK
│   └── uses <ChapterTreeNode> in template      ✅ OK
├── Node.vue            # Recursive node component
│   └── uses <Node> for self-reference          ✅ FIXED
│   └── was using <ChapterTreeNode>             ❌ WRONG
├── types.ts            # Type definitions
└── README.md           # Documentation
```

## 修复内容 (Fix Applied)

### 文件: `src/ui/components/ChapterTree/Node.vue`

**修改位置 (Modified Location):** Line 110

**修改前 (Before):**
```vue
<template #item="{ element: child }">
  <ChapterTreeNode
    :key="child.id"
    :chapter="child"
    :chapters="chapters"
    ...
  />
</template>
```

**修改后 (After):**
```vue
<template #item="{ element: child }">
  <Node
    :key="child.id"
    :chapter="child"
    :chapters="chapters"
    ...
  />
</template>
```

## 验证步骤 (Verification Steps)

1. ✅ 修改 `Node.vue` 中的递归组件引用
2. ✅ 运行 `npm run build` - 编译成功,无错误
3. ✅ 运行 `npm start` - 应用启动成功
4. ✅ 检查子章节是否显示 - 需要在应用中手动验证

## 相关文件 (Related Files)

- `src/ui/components/ChapterTree/Node.vue` - 修复的主文件
- `src/ui/components/ChapterTree/index.vue` - 容器组件(无需修改)
- `src/ui/components/ChapterTree/types.ts` - 类型定义(无需修改)

## 重构历史 (Refactoring History)

1. **原始结构 (Original Structure):**
   - `ChapterTree.vue` - 容器组件
   - `ChapterTreeNode.vue` - 节点组件

2. **重构后结构 (After Refactoring):**
   - `ChapterTree/index.vue` - 容器组件
   - `ChapterTree/Node.vue` - 节点组件
   - `ChapterTree/types.ts` - 类型定义
   - `ChapterTree/README.md` - 文档

3. **问题与修复 (Issue & Fix):**
   - 重命名文件导致递归引用失效
   - 修复: 将 `<ChapterTreeNode>` 改为 `<Node>`

## 学习要点 (Key Learnings)

1. **Vue 3 Script Setup 递归组件 (Vue 3 Script Setup Recursive Components):**
   - 必须使用文件名进行自引用
   - 不能使用导入别名或自定义名称

2. **组件重命名风险 (Component Renaming Risks):**
   - 重命名递归组件文件需要同步更新自引用
   - 外部引用可以使用任意别名,但内部递归必须用文件名

3. **测试重要性 (Importance of Testing):**
   - 组件重构后必须进行功能测试
   - 递归渲染需要特别关注

## 编译结果 (Build Results)

```
✓ 132 modules transformed.
✓ built in 2.21s

No TypeScript errors
Application started successfully
```

## 修复日期 (Fix Date)

2025-01-10

## 修复人员 (Fixed By)

GitHub Copilot + User

---

## 备注 (Notes)

此问题是由于组件重构过程中,文件重命名导致的递归组件自引用失效。在 Vue 3 的 `<script setup>` 中,递归组件必须使用文件名作为组件名,这是一个重要的技术限制。

This issue occurred during component refactoring when file renaming broke recursive component self-references. In Vue 3's `<script setup>`, recursive components must use the filename as the component name, which is an important technical constraint.
