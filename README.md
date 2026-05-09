# School Portal Server

校园门户后端 API 服务

## 技术栈

- Node.js + Express
- MySQL 数据库
- JWT 认证

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 MySQL 数据库连接：

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=schoolportal
```

### 3. 创建数据库

```sql
CREATE DATABASE schoolportal;
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 http://localhost:8080 启动

## API 接口

### 认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/send-code` | POST | 发送验证码 |
| `/api/auth/verify-code` | POST | 验证验证码 |

### 管理接口 (需要管理员权限)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/users` | GET | 获取用户列表 |
| `/api/admin/users/create` | POST | 创建用户 |
| `/api/admin/users/update` | POST | 更新用户 |
| `/api/admin/users/delete` | POST | 删除用户 |
| `/api/admin/users/batch-delete` | POST | 批量删除用户 |
| `/api/admin/settings` | GET | 获取设置 |
| `/api/admin/settings/update` | POST | 更新设置 |

### 直播接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/live/channels` | GET | 获取频道列表 |
| `/api/live/channels/create` | POST | 创建频道 |
| `/api/live/schedule` | GET | 获取直播列表 |
| `/api/live/book` | POST | 预约直播 |
| `/api/live/stream-key` | GET | 获取推流信息 |

### 公告接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/notices` | GET | 获取公告列表 |

## 部署到 Vercel

1. 在 Vercel 创建新项目
2. 配置环境变量 (MYSQL_HOST, MYSQL_USER 等)
3. 部署

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MYSQL_HOST` | MySQL 服务器地址 | localhost |
| `MYSQL_PORT` | MySQL 端口 | 3306 |
| `MYSQL_USER` | 数据库用户名 | root |
| `MYSQL_PASSWORD` | 数据库密码 | - |
| `MYSQL_DATABASE` | 数据库名称 | schoolportal |
| `SMTP_HOST` | SMTP 服务器地址 | - |
| `SMTP_PORT` | SMTP 端口 | 587 |
| `SMTP_USER` | SMTP 用户名 | - |
| `SMTP_PASS` | SMTP 密码 | - |
| `SMTP_FROM` | 发件人邮箱 | - |
| `RTMP_HOST` | RTMP 服务器地址 | localhost |