# Vercel 部署指南

本项目使用**分支策略**来管理不同部署环境：

- **main 分支**：SQLite（本地开发和 Docker 部署）
- **vercel 分支**：PostgreSQL（Vercel 部署）

## 快速开始（推荐）

如果你只是想快速部署到 Vercel，**最简单的方式**：

1. Fork 本项目
2. 在 Vercel 中选择部署 **`vercel` 分支**（不是 main）
3. 创建 PostgreSQL 数据库（Vercel Postgres、Supabase 或其他）
4. 设置 `DATABASE_URL` 环境变量
5. 部署完成！

**就这么简单！** 数据库配置已经在 vercel 分支中配好了，无需手动修改。

## 为什么需要 PostgreSQL？

- Vercel 的文件系统是**只读**的
- SQLite 需要写入文件，在 Vercel 上会失败
- PostgreSQL 是云数据库，支持 Vercel 这种无状态环境

## 部署步骤

### 步骤 1：选择数据库服务

选择以下任意一种：

**推荐方案 1：Vercel Postgres（官方集成，最简单）**
- 无需额外注册账号
- 在 Vercel Dashboard 中直接创建
- 自动配置环境变量

**备选方案 2：Supabase（免费 PostgreSQL）**
- 无限免费额度（适合个人项目）
- 注册地址：https://supabase.com

**备选方案 3：阿里云 RDS（国内快速）**
- 适合国内用户
- 付费但便宜（按使用量计费）

### 步骤 2：创建 Vercel Postgres 数据库（推荐）

1. 进入 [Vercel Dashboard](https://vercel.com)
2. 选择你的 PixelHub 项目
3. 点击 **Storage** 标签页
4. 点击 **Create Database** → 选择 **Postgres**
5. 设置 Custom Prefix 为 `DATABASE`
6. 点击 **Connect**

Vercel 会自动添加 `DATABASE_URL` 环境变量到你的项目。

### 步骤 3：修改数据库配置

**修改本地 `.env` 文件（如果本地也想测试）：**

```env
DATABASE_URL="postgresql://user:password@host:5432/pixelhub"
```

获取 Postgres 连接字符串的方法：
- Vercel Postgres：在 **Storage** → **Postgres** → **Data** → 复制连接字符串
- Supabase：在项目设置 → **Database** → 复制 URI

### 步骤 4：修改 Prisma Schema

修改 `prisma/schema.prisma`，将 SQLite 改为 PostgreSQL：

```prisma
datasource db {
  provider = "postgresql"  # 改自 "sqlite"
  url      = env("DATABASE_URL")
}
```

### 步骤 5：提交并部署

```bash
git add prisma/schema.prisma
git commit -m "chore: switch to PostgreSQL for Vercel deployment"
git push origin main
```

Vercel 会自动触发部署，部署过程中：
1. ✅ `prisma generate` 生成 Prisma Client
2. ✅ `npx prisma migrate deploy` 创建表结构
3. ✅ 应用启动

### 步骤 6：验证部署

部署完成后访问你的 Vercel 应用链接，测试以下功能：
- ✅ 上传图片
- ✅ 删除图片
- ✅ 修改设置
- ✅ 搜索和浏览图片

## 本地开发和 Vercel 部署并行

如果想同时维护本地 SQLite 开发和 Vercel 部署：

**创建两个分支：**

```bash
# 主分支：SQLite（本地开发）
git checkout main
# DATABASE_URL="file:./dev.db"
# prisma/schema.prisma: provider = "sqlite"

# Vercel 分支：PostgreSQL
git checkout -b vercel
# DATABASE_URL="postgresql://..."
# prisma/schema.prisma: provider = "postgresql"
# 在 Vercel 中连接这个分支部署
```

**或者直接改 schema.prisma：**

```bash
# 在 Vercel 中部署前修改一次
git checkout vercel-ready
# 改好 schema 和环境变量
git push origin vercel-ready
# 在 Vercel 中选择部署这个分支
```

## 常见问题

**Q：我想在本地用 Supabase，在 Vercel 用 Vercel Postgres 可以吗？**

A：完全可以！只需改 `DATABASE_URL` 环境变量，代码无需改动：
```bash
# 本地 .env
DATABASE_URL="postgresql://supabase..."

# Vercel 环境变量
DATABASE_URL="postgresql://vercel..."
```

**Q：国内用户访问会不会很慢？**

A：可以选择国内数据库服务：
- 阿里云 RDS PostgreSQL（推荐）
- 腾讯云 CynosDB（兼容 PostgreSQL）
- 华为云 RDS

**Q：如何从 Vercel 回到本地 SQLite 开发？**

A：很简单：
```bash
# 1. 改回 schema.prisma
provider = "sqlite"

# 2. 改回 .env
DATABASE_URL="file:./dev.db"

# 3. 初始化本地数据库
npx prisma db push
npx prisma db seed
```

**Q：数据会不会丢失？**

A：如果你用的是同一个 PostgreSQL 数据库（如 Supabase），改 provider 不会丢失数据。但改数据库服务（如从 Vercel Postgres 改到 Supabase）需要数据迁移。

## 回到本地 SQLite 开发

```bash
# 修改 prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

# 修改 .env
DATABASE_URL="file:./dev.db"

# 重新初始化
npx prisma db push
npx prisma db seed
npm run dev
```

## 需要帮助？

- Vercel 官方文档：https://vercel.com/docs/storage/postgres
- Supabase 官方文档：https://supabase.com/docs
- Prisma 多数据库支持：https://www.prisma.io/docs/concepts/database-connectors

