# 贡献指南

感谢你考虑为 PixelHub 做出贡献！

## 如何贡献

### 报告 Bug

如果你发现了 bug，请：

1. 在 [Issues](https://github.com/yuhuotech/pixelhub/issues) 中搜索是否已有相关问题
2. 如果没有，创建一个新的 Issue，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为和实际行为
   - 截图（如果适用）
   - 环境信息（操作系统、浏览器版本等）

### 提出新功能

1. 先在 Issues 中讨论你的想法
2. 等待维护者的反馈
3. 获得批准后再开始开发

### 提交代码

1. **Fork 项目**
   ```bash
   git clone https://github.com/yuhuotech/pixelhub.git
   cd pixelhub
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **开发**
   - 遵循现有代码风格
   - 添加必要的注释
   - 确保代码通过 lint 检查

5. **测试**
   ```bash
   pnpm lint
   pnpm build
   ```

6. **提交**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Commit 消息格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 重构
   - `test:` 测试相关
   - `chore:` 构建/工具相关

7. **推送**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   - 清晰描述你的更改
   - 关联相关 Issue
   - 等待 review

## 开发规范

### 数据库配置

本地开发默认使用 SQLite，无需额外配置：

```bash
# .env 文件（开发环境）
DATABASE_URL="file:./dev.db"
```

数据库会在首次启动时自动创建。

**初始化数据库：**

```bash
npx prisma db push      # 创建表结构
npx prisma db seed      # 创建默认管理员用户（admin/admin）
```

**重置数据库（删除所有数据）：**

```bash
npx prisma db push --force-reset  # 警告：会删除所有数据并重新创建表
npx prisma db seed                 # 重新创建默认用户
```

**若要部署到 Vercel：**

需要改用 PostgreSQL 数据库。详见 [Vercel 部署指南](./VERCEL_DEPLOYMENT.md)

### 代码风格

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用函数式组件和 Hooks
- 使用有意义的变量和函数名

### 文件结构

```
app/              # Next.js App Router
components/       # React 组件
lib/             # 工具函数和配置
prisma/          # 数据库 Schema
public/          # 静态资源
```

### 组件规范

```typescript
// 使用 TypeScript 类型
interface ComponentProps {
  title: string
  onClick?: () => void
}

// 使用函数式组件
export default function Component({ title, onClick }: ComponentProps) {
  // 组件逻辑
  return <div>{title}</div>
}
```

## 问题和帮助

如有任何问题，欢迎：

- 在 Issues 中提问
- 加入我们的讨论组
- 发送邮件至 hongmw@yuhuotech.com

## 行为准则

请保持友善和尊重，我们致力于营造一个开放和包容的社区环境。

---

再次感谢你的贡献！🎉
