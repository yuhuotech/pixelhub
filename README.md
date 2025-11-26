# PixelHub

<div align="center">

![PixelHub](https://img.shields.io/badge/PixelHub-v1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**现代化、多存储后端的个人图床解决方案**

[English](./README_EN.md) | 简体中文

[在线演示](#) · [快速开始](#快速开始) · [功能特性](#功能特性) · [部署指南](#部署指南)

</div>

---

## 📖 简介

PixelHub 是一个功能强大、界面优雅的开源图床系统，支持多种云存储后端，提供丰富的上传方式和便捷的图片管理功能。无论是个人博客、技术文档还是团队协作，PixelHub 都能满足您的图片托管需求。

### ✨ 核心亮点

- 🎯 **多存储后端支持** - 支持腾讯云 COS、阿里云 OSS、Gitee、GitHub 和本地存储
- 🔄 **多存储并存** - 不同图片可使用不同存储后端，历史数据永久可访问
- 🚀 **多种上传方式** - 拖拽上传、粘贴上传、URL 上传，满足各种使用场景
- 🎨 **现代化界面** - 基于 Next.js 14+ 和 Tailwind CSS，支持深色模式
- 🔍 **实时搜索** - 快速查找图片，支持文件名搜索
- 📅 **时间轴视图** - 按日期分组展示，清晰管理图片
- 🗑️ **回收站功能** - 软删除机制，误删可恢复
- 🔐 **访问控制** - 简单的密码保护机制

---

## 🎯 功能特性

### 存储后端

| 存储类型 | 说明 | 配置难度 |
|---------|------|---------|
| 🌐 **腾讯云 COS** | 稳定可靠，国内访问速度快 | ⭐⭐ |
| ☁️ **阿里云 OSS** | 阿里云对象存储服务 | ⭐⭐ |
| 🐙 **GitHub** | 免费，适合开源项目 | ⭐ |
| 🦊 **Gitee** | 国内访问速度快 | ⭐ |
| 💾 **本地存储** | 无需配置，开箱即用 | ⭐ |

### 上传方式

- **📁 本地文件上传** - 支持拖拽和点击选择
- **📋 粘贴上传** - `Ctrl+V` / `Cmd+V` 快捷键直接粘贴图片
- **🔘 浮动按钮** - 右下角一键粘贴上传
- **🌐 URL 上传** - 输入图片链接自动下载并上传

### 图片管理

- **🔍 实时搜索** - 快速查找图片
- **📅 时间轴视图** - 按日期分组展示
- **🗑️ 回收站** - 软删除，支持恢复
- **🖼️ Lightbox 预览** - 优雅的图片查看器
- **📋 一键复制** - 支持 URL、Markdown、HTML 格式

---

## 🚀 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- PostgreSQL / MySQL / SQLite（任选其一）
- pnpm / npm / yarn（推荐使用 pnpm）

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/yourusername/pixelhub.git
cd pixelhub
```

2. **安装依赖**

```bash
pnpm install
# 或
npm install
```

3. **配置环境变量**

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

4. **初始化数据库**

```bash
npx prisma db push
```

5. **启动开发服务器**

```bash
pnpm dev
# 或
npm run dev
```

访问 `http://localhost:3003` 即可使用。

---

## ⚙️ 配置说明

### 基础配置

```env
# 访问密码（可选）
ACCESS_CODE=your_password_here

# 存储类型：cos | oss | gitee | github | local
STORAGE_TYPE=local

# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/pixelhub"
```

### 存储后端配置

<details>
<summary><b>腾讯云 COS</b></summary>

```env
STORAGE_TYPE=cos
COS_SECRET_ID=your_secret_id
COS_SECRET_KEY=your_secret_key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou
```

</details>

<details>
<summary><b>阿里云 OSS</b></summary>

```env
STORAGE_TYPE=oss
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your-bucket-name
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

</details>

<details>
<summary><b>GitHub</b></summary>

```env
STORAGE_TYPE=github
GITHUB_ACCESS_TOKEN=ghp_your_token
GITHUB_OWNER=your_username
GITHUB_REPO=your_repo_name
GITHUB_BRANCH=main
```

需要创建一个 Personal Access Token，权限需要包含 `repo`。

</details>

<details>
<summary><b>Gitee</b></summary>

```env
STORAGE_TYPE=gitee
GITEE_ACCESS_TOKEN=your_token
GITEE_OWNER=your_username
GITEE_REPO=your_repo_name
GITEE_BRANCH=master
```

</details>

<details>
<summary><b>本地存储</b></summary>

```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
```

</details>

---

## 📦 部署指南

### Vercel 部署（推荐）

1. Fork 本项目到你的 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署完成

### Docker 部署

```bash
# 构建镜像
docker build -t pixelhub .

# 运行容器
docker run -d \
  -p 3003:3003 \
  -e DATABASE_URL="your_database_url" \
  -e STORAGE_TYPE="local" \
  --name pixelhub \
  pixelhub
```

### 传统部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

---

## 🛠️ 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) - React 全栈框架
- **语言**: [TypeScript](https://www.typescriptlang.org/) - 类型安全
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/) - 原子化 CSS
- **数据库**: [Prisma](https://www.prisma.io/) - 现代化 ORM
- **动画**: [Framer Motion](https://www.framer.com/motion/) - 流畅动画
- **图标**: [Lucide React](https://lucide.dev/) - 优雅图标库

---

## 📸 截图预览

### 主界面
![主界面](./docs/screenshots/main.png)

### 上传界面
![上传界面](./docs/screenshots/upload.png)

### 时间轴视图
![时间轴视图](./docs/screenshots/timeline.png)

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 提交前运行 `pnpm lint` 检查代码
- 编写清晰的 commit message

---

## 📝 开源协议

本项目采用 [MIT](./LICENSE) 协议开源。

---

## 🙏 致谢

感谢以下开源项目：

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Framer Motion](https://www.framer.com/motion/)

---

## 📮 联系方式

- 提交 Issue: [GitHub Issues](https://github.com/yourusername/pixelhub/issues)
- 邮箱: your.email@example.com

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star 支持一下！**

Made with ❤️ by [Your Name](https://github.com/yourusername)

</div>
