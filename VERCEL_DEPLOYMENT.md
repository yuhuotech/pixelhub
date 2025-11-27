# Vercel 部署指南

本项目采用**统一 main 分支部署**策略，所有环境都从 main 分支部署：

- **本地开发**：SQLite（默认）
- **Vercel 生产环境**：PostgreSQL（自动切换）

构建时的 `build-vercel.js` 脚本会自动根据部署环境切换数据库供应商，无需维护多个分支。

## 快速开始（推荐）

如果你只是想快速部署到 Vercel：

1. Fork 本项目
2. 在 Vercel 中选择部署 **`main` 分支**
3. 创建 PostgreSQL 数据库（Vercel Postgres、Supabase 或其他）
4. 设置 `DATABASE_URL` 环境变量
5. 部署完成！

**就这么简单！** 构建脚本会自动检测 Vercel 环境并切换到 PostgreSQL，无需修改代码。

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

### 步骤 3：配置环境变量

在 Vercel Dashboard 中设置 `DATABASE_URL` 环境变量：

- **Vercel Postgres**：在 **Storage** → **Postgres** → **Data** 中复制连接字符串
- **Supabase**：在项目设置 → **Database** → 复制 URI
- **其他云数据库**：使用对应服务提供的 PostgreSQL 连接字符串

**无需修改代码！** 构建脚本会自动完成：

```
npm run build:vercel (构建脚本会自动)
├── 检测 Vercel 环境
├── 临时替换 SQLite → PostgreSQL
├── 运行迁移和初始化
└── 恢复原始配置（SQLite）
```

### 步骤 4：部署

```bash
git push origin main
```

Vercel 会自动触发部署，部署过程中：
1. ✅ 脚本检测到 Vercel 环境
2. ✅ 自动替换为 PostgreSQL 配置
3. ✅ `npx prisma migrate deploy` 创建表结构
4. ✅ 初始化管理员用户和设置
5. ✅ 应用启动

### 步骤 5：验证部署

部署完成后访问你的 Vercel 应用链接，测试以下功能：
- ✅ 上传图片
- ✅ 删除图片
- ✅ 修改设置
- ✅ 搜索和浏览图片

## 本地开发和 Vercel 部署并行

现在无需创建多个分支！构建脚本自动处理：

**本地开发（SQLite）：**

```bash
# 默认使用 SQLite
npm run dev
# 使用本地 ./dev.db
```

**Vercel 部署（PostgreSQL）：**

```bash
# 同一份代码部署到 Vercel
# Vercel 自动运行 npm run build:vercel
# 脚本自动切换到 PostgreSQL
```

无需修改代码或切换分支，一个仓库支持两种环境！

## 常见问题

**Q：我想在本地用 PostgreSQL 开发，而不是 SQLite？**

A：完全可以！只需改 `.env` 中的 `DATABASE_URL`，代码无需改动：
```bash
# 本地 .env - 使用 PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/pixelhub"

# Vercel 环境变量 - 使用其他 PostgreSQL
DATABASE_URL="postgresql://vercel-postgres-url"
```

构建脚本会自动检测环境变量并调整配置。

**Q：国内用户访问会不会很慢？**

A：可以选择国内数据库服务：
- 阿里云 RDS PostgreSQL（推荐）
- 腾讯云 CynosDB（兼容 PostgreSQL）
- 华为云 RDS

**Q：如何从 PostgreSQL 切回本地 SQLite 开发？**

A：很简单，只需改 `.env` 即可，无需改代码：
```bash
# 1. 改回 .env
DATABASE_URL="file:./dev.db"

# 2. 初始化本地数据库
npx prisma db push
npx prisma db seed

# 3. 启动开发服务器
npm run dev
```

代码本身无需改动，构建脚本会自动处理。

**Q：数据会不会丢失？**

A：如果你用的是同一个 PostgreSQL 数据库（如 Supabase），改 provider 不会丢失数据。但改数据库服务（如从 Vercel Postgres 改到 Supabase）需要数据迁移。

## 回到本地 SQLite 开发

无需修改代码，只需改环境变量：

```bash
# 修改 .env
DATABASE_URL="file:./dev.db"

# 重新初始化
npx prisma db push
npx prisma db seed
npm run dev
```

构建脚本 `build-vercel.js` 会自动根据 `DATABASE_URL` 调整配置。

## 需要帮助？

- Vercel 官方文档：https://vercel.com/docs/storage/postgres
- Supabase 官方文档：https://supabase.com/docs
- Prisma 多数据库支持：https://www.prisma.io/docs/concepts/database-connectors

