# PixelHub

<div align="center">

![PixelHub](https://img.shields.io/badge/PixelHub-v1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-Apache%202.0-green)

**Modern Personal Image Hosting Solution with Multi-Storage Backend Support**

English | [简体中文](./README.md)

[Live Demo](https://pixelhub-demo.vercel.app/) · [Quick Start](#quick-start) · [Features](#features) · [Deployment](#deployment)

</div>

---

## 📖 Introduction

PixelHub is a powerful and elegant open-source image hosting system that supports multiple cloud storage backends, providing diverse upload methods and convenient image management features. Whether for personal blogs, technical documentation, or team collaboration, PixelHub meets all your image hosting needs.

### ✨ Core Highlights

- 🎯 **Multi-Storage Backend Support** - Tencent COS, Aliyun OSS, Gitee, GitHub, and Local Storage
- 🔄 **Multiple Storage Coexistence** - Different images can use different storage backends, historical data is permanently accessible
- 🚀 **Multiple Upload Methods** - Drag & drop, paste, URL upload for various scenarios
- 🎨 **Modern UI** - Built with Next.js 14+ and Tailwind CSS, supports dark mode
- 🔍 **Real-time Search** - Quick image search with filename support
- 📅 **Timeline View** - Group by date for clear image management
- 🗑️ **Trash Functionality** - Soft delete with recovery option
- 🔐 **Access Control** - Simple password protection

---

## 🎯 Features

### Storage Backends

| Storage Type | Description | Setup Difficulty |
|---------|------|---------|
| 🌐 **Tencent Cloud COS** | Stable and reliable with fast domestic access | ⭐⭐ |
| ☁️ **Aliyun OSS** | Aliyun object storage service | ⭐⭐ |
| 🐙 **GitHub** | Free, suitable for open-source projects | ⭐ |
| 🦊 **Gitee** | Fast domestic access | ⭐ |
| 💾 **Local Storage** | No configuration needed, works out of the box | ⭐ |

### Upload Methods

- **📁 Local File Upload** - Supports drag & drop and click to select
- **📋 Paste Upload** - `Ctrl+V` / `Cmd+V` keyboard shortcut to paste images directly
- **🔘 Floating Button** - One-click paste upload in bottom right corner
- **🌐 URL Upload** - Enter image URL to auto-download and upload

### Image Management

- **🔍 Real-time Search** - Quick image discovery
- **📅 Timeline View** - Group by date for easy browsing
- **🗑️ Trash** - Soft delete with recovery support
- **🖼️ Lightbox Preview** - Elegant image viewer
- **📋 One-click Copy** - Support for URL, Markdown, and HTML formats

---

## 🌐 Live Demo

📌 **Try Now**: [https://pixelhub-demo.vercel.app/](https://pixelhub-demo.vercel.app/)

**Demo Account**:
- Username: `admin`
- Password: `admin`

---

## 🚀 Quick Start

### Requirements

- Node.js 18.0 or higher
- PostgreSQL / MySQL / SQLite (any one)
- pnpm / npm / yarn (pnpm recommended)

### Installation Steps

1. **Clone Repository**

```bash
git clone https://github.com/yuhuotech/pixelhub.git
cd pixelhub
```

2. **Install Dependencies**

```bash
pnpm install
# or
npm install
```

3. **Configure Environment Variables**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

By default, SQLite is used and requires no additional configuration - works out of the box.

4. **Initialize Database**

```bash
npx prisma db push
```

5. **Start Development Server**

```bash
pnpm dev
# or
npm run dev
```

Access `http://localhost:3003` to use the application.

---

## ⚙️ Configuration

### Basic Configuration

```env
# Access password (optional)
ACCESS_CODE=your_password_here

# Storage type: cos | oss | gitee | github | local
STORAGE_TYPE=local

# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/pixelhub"
```

### Storage Backend Configuration

**Storage backend configuration can now be done directly in the application's system settings without modifying code or restarting.**

After opening the application, click the ⚙️ Settings button in the top right corner to access the system settings and configure the storage backends:

#### Supported Storage Backends and Configuration Items

| Storage Type | Required Configuration |
|---------|----------|
| **Tencent Cloud COS** | Secret ID, Secret Key, Bucket, Region |
| **Aliyun OSS** | Access Key ID, Access Key Secret, Bucket, Region, Endpoint |
| **GitHub** | Access Token, Username, Repository, Branch |
| **Gitee** | Access Token, Username, Repository, Branch |
| **Local Storage** | Storage Path (optional) |

![System Settings](https://raw.githubusercontent.com/yuhuotech/yh-image/main/uploads/202511/1764144388180-Paste_20251126_160628.png)

---

## 📦 Deployment

### Docker Deployment (Recommended)

Start with Docker Compose in one command (includes application and all configuration):

```bash
docker-compose up -d
```

The project includes `docker-compose.yml` with default configuration:
- Application port: 3003
- Database: SQLite (./dev.db)
- Storage type: Local Storage

### Traditional Deployment

Run on your server or locally:

```bash
# Install dependencies
npm install

# Initialize database
npx prisma db push

# Build production version
npm run build

# Start production server
npm start
```

The application will start at `http://localhost:3003`.

### Vercel Deployment

The project includes a dedicated **`vercel` branch** with PostgreSQL pre-configured for easy deployment:

1. Fork this project to GitHub
2. Import the project in Vercel, **select the `vercel` branch**
3. Create a PostgreSQL database (Vercel Postgres, Supabase, etc.)
4. Set the `DATABASE_URL` environment variable
5. Deployment complete!

No code changes needed - the database is already configured.

See [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md) for detailed steps and FAQs.

### Database Information

The project uses **branch strategy** for database configuration:

| Branch | Purpose | Database |
|-----|------|--------|
| **main** | Local development, Docker deployment | SQLite |
| **vercel** | Vercel deployment | PostgreSQL |

- **main branch**: Works out of the box, no configuration needed, perfect for local and Docker deployment
- **vercel branch**: PostgreSQL pre-configured for Vercel deployment

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) - React full-stack framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS
- **Database**: [Prisma](https://www.prisma.io/) - Modern ORM
- **Animation**: [Framer Motion](https://www.framer.com/motion/) - Smooth animations
- **Icons**: [Lucide React](https://lucide.dev/) - Beautiful icon library

---

## 📸 Screenshots

### Main Interface
![Main Interface](https://raw.githubusercontent.com/yuhuotech/yh-image/main/uploads/202511/1764143576089-Paste_20251126_155256.png)

### Upload Interface
![Upload Interface](https://raw.githubusercontent.com/yuhuotech/yh-image/main/uploads/202511/1764143641024-Paste_20251126_155400.png)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork this project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Write code using TypeScript
- Follow ESLint rules
- Run `pnpm lint` before committing to check code
- Write clear commit messages

---

## 📝 License

This project is open-sourced under the [Apache License 2.0](./LICENSE) license.

---

## 🙏 Acknowledgments

Thanks to the following open-source projects:

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Framer Motion](https://www.framer.com/motion/)

---

## 📮 Contact

- Submit Issues: [GitHub Issues](https://github.com/yuhuotech/pixelhub/issues)
- Email: hongmw@yuhuotech.com

---

<div align="center">

**If this project helps you, please give it a ⭐️ Star!**

Made with ❤️ by [YuhuoTech](https://github.com/yuhuotech)

</div>
