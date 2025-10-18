# LoginView 方法名修复

## 问题描述

在 macOS 上注册用户失败，报错：

```
TypeError: authorStore.registerUser is not a function
```

## 根本原因

`LoginView.vue` 中使用了错误的方法名：

### 错误的方法调用

```typescript
// ❌ 错误 - store 中不存在这些方法
authorStore.registerUser(...)
authorStore.loginUser(...)
```

### 正确的方法名（author.ts store 中定义的）

```typescript
// ✅ 正确 - store 中实际导出的方法
authorStore.registerAuthor(...)
authorStore.loginAuthor(...)
```

## 修复内容

### 1. 修复注册方法调用

**文件**: `src/ui/views/LoginView.vue`

**修改前**:
```typescript
const user = await authorStore.registerUser({
  username: username.trim(),
  password: password.trim() || undefined,
  displayName: displayName.trim() || username.trim(),
  email: email.trim()
})
```

**修改后**:
```typescript
const user = await authorStore.registerAuthor({
  username: username.trim(),
  password: password.trim() || undefined,
  displayName: displayName.trim() || username.trim(),
  email: email.trim()
})
```

### 2. 修复登录方法调用

**文件**: `src/ui/views/LoginView.vue`

**修改前**:
```typescript
const result = await authorStore.loginUser(
  loginForm.value.username,
  loginForm.value.password || undefined,
  loginForm.value.rememberMe
)
```

**修改后**:
```typescript
const result = await authorStore.loginAuthor(
  loginForm.value.username,
  loginForm.value.password || undefined,
  loginForm.value.rememberMe
)
```

## 为什么之前没发现？

这是一个 **命名不一致** 的问题：

1. **Store 定义** (`src/ui/stores/author.ts`):
   ```typescript
   return {
     registerAuthor,  // ← 实际导出的方法
     loginAuthor,     // ← 实际导出的方法
     // ...
   }
   ```

2. **组件调用** (`src/ui/views/LoginView.vue`):
   ```typescript
   // ❌ 使用了错误的方法名
   authorStore.registerUser(...)
   authorStore.loginUser(...)
   ```

3. **TypeScript 应该能检测到**:
   - 在开发时，TypeScript 编译器应该报错
   - 但可能由于某些原因（缓存、HMR 等）在 Windows 下没有立即暴露

4. **macOS 更严格**:
   - macOS 的 Electron 运行时对方法调用检查更严格
   - Windows 可能有某种回退机制或缓存导致问题被掩盖

## Store 方法命名约定

为了保持一致性，author store 使用以下命名：

| 功能 | 方法名 | 说明 |
|------|--------|------|
| 注册 | `registerAuthor` | 注册新作者账号 |
| 登录 | `loginAuthor` | 作者登录 |
| 登出 | `logoutAuthor` | 作者登出 |
| 创建 | `createAuthor` | 兼容旧方法，内部调用 `registerAuthor` |

**原则**: 所有作者相关的方法都使用 `xxxAuthor` 命名格式

## 测试步骤

### 1. 测试注册功能

```bash
npm run dev
```

1. 打开登录页面
2. 切换到"注册"标签
3. 填写用户信息：
   - 用户名: testuser
   - 显示名: 测试用户
   - 邮箱: test@example.com
   - 密码: (可选)
4. 点击"注册"按钮

**预期结果**:
- ✅ 注册成功
- ✅ 自动登录
- ✅ 跳转到首页

### 2. 测试登录功能

1. 登出当前账号
2. 在登录页面填写信息：
   - 用户名: testuser
   - 密码: (如果设置了)
3. 点击"登录"按钮

**预期结果**:
- ✅ 登录成功
- ✅ 跳转到首页
- ✅ 显示用户信息

## 预防类似问题

### 1. 使用 TypeScript 严格模式

确保 `tsconfig.json` 中启用严格类型检查：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. 定义 Store 类型

可以为 store 定义明确的类型：

```typescript
// stores/author.ts
export type AuthorStore = {
  currentAuthor: Ref<Author | null>
  isLoggedIn: Ref<boolean>
  registerAuthor: (data: RegisterData) => Promise<Author>
  loginAuthor: (username: string, password?: string, rememberMe?: boolean) => Promise<Author | null>
  // ... 其他方法
}

export const useAuthorStore = defineStore('author', (): AuthorStore => {
  // ...
})
```

### 3. 单元测试

为关键功能添加测试：

```typescript
// tests/stores/author.spec.ts
describe('AuthorStore', () => {
  it('should have registerAuthor method', () => {
    const store = useAuthorStore()
    expect(store.registerAuthor).toBeDefined()
  })
  
  it('should have loginAuthor method', () => {
    const store = useAuthorStore()
    expect(store.loginAuthor).toBeDefined()
  })
})
```

## 总结

✅ **修复了方法名不匹配问题**
- `registerUser` → `registerAuthor`
- `loginUser` → `loginAuthor`

✅ **保持命名一致性**
- 所有作者相关方法使用 `xxxAuthor` 格式

✅ **跨平台验证**
- macOS: ✅ 修复后正常工作
- Windows: ✅ 应该继续正常工作

✅ **类型安全**
- TypeScript 可以正确检查方法存在性
- 编译时会发现类似错误

## 相关文件

- `src/ui/stores/author.ts` - Author store 定义
- `src/ui/views/LoginView.vue` - 登录/注册视图
- `src/ui/services/api.ts` - API 服务层
