#!/bin/bash

# Docker 构建和推送脚本
# 用法: ./scripts/docker-push.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
  echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
  echo -e "${GREEN}✓ ${1}${NC}"
}

print_warn() {
  echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
  echo -e "${RED}✗ ${1}${NC}"
}

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
  print_error "Docker 未安装，请先安装 Docker"
  exit 1
fi

# 获取 Docker Hub 用户名
print_info "请输入 Docker Hub 用户名:"
read -p "用户名: " DOCKER_USERNAME

if [ -z "$DOCKER_USERNAME" ]; then
  print_error "用户名不能为空"
  exit 1
fi

# 获取版本标签
print_info "请输入版本标签 (例如: 1.0.0):"
read -p "版本标签: " VERSION_TAG

if [ -z "$VERSION_TAG" ]; then
  print_error "版本标签不能为空"
  exit 1
fi

IMAGE_NAME="${DOCKER_USERNAME}/pixelhub"
TAGGED_IMAGE="${IMAGE_NAME}:${VERSION_TAG}"
LATEST_IMAGE="${IMAGE_NAME}:latest"

print_info "镜像信息:"
echo "  用户名: $DOCKER_USERNAME"
echo "  镜像名: $IMAGE_NAME"
echo "  版本标签: $VERSION_TAG"
echo "  标签镜像: $TAGGED_IMAGE"
echo "  最新镜像: $LATEST_IMAGE"

# 检查 Docker 登录状态
print_info "检查 Docker 登录状态..."

if docker info > /dev/null 2>&1; then
  # 尝试访问私有仓库来验证登录状态
  if docker login --username "$DOCKER_USERNAME" --password-stdin < /dev/null > /dev/null 2>&1; then
    print_success "已连接到 Docker"
  else
    # 检查是否可以访问用户的仓库
    if docker pull "$IMAGE_NAME:latest" > /dev/null 2>&1 || docker info > /dev/null 2>&1; then
      print_success "已经登录"
    else
      print_warn "未检测到 Docker Hub 登录状态"
      print_info "开始登录 Docker Hub..."
      docker login --username "$DOCKER_USERNAME"

      if [ $? -ne 0 ]; then
        print_error "Docker 登录失败"
        exit 1
      fi

      print_success "Docker 登录成功"
    fi
  fi
else
  print_error "Docker daemon 未运行"
  exit 1
fi

# 构建镜像
print_info "开始构建 Docker 镜像..."
print_info "构建命令: docker build -t $TAGGED_IMAGE -t $LATEST_IMAGE ."

if docker build -t "$TAGGED_IMAGE" -t "$LATEST_IMAGE" .; then
  print_success "镜像构建成功"
else
  print_error "镜像构建失败"
  exit 1
fi

# 推送版本标签镜像
print_info "推送版本标签镜像: $TAGGED_IMAGE"
if docker push "$TAGGED_IMAGE"; then
  print_success "版本标签镜像推送成功"
else
  print_error "版本标签镜像推送失败"
  exit 1
fi

# 推送最新镜像
print_info "推送最新镜像: $LATEST_IMAGE"
if docker push "$LATEST_IMAGE"; then
  print_success "最新镜像推送成功"
else
  print_error "最新镜像推送失败"
  exit 1
fi

echo ""
print_success "全部完成！"
echo ""
echo "镜像信息:"
echo "  版本标签: $TAGGED_IMAGE"
echo "  最新镜像: $LATEST_IMAGE"
echo ""
print_info "可以使用以下命令拉取镜像:"
echo "  docker pull $TAGGED_IMAGE"
echo "  docker pull $LATEST_IMAGE"
