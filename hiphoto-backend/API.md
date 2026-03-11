# HiPhoto API 文档

## 数据库结构

### users 表
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT,
    bio TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_code TEXT,
    created_at TEXT NOT NULL
)
```

### rooms 表
```sql
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    upload_limit INTEGER DEFAULT 10,
    scoring_criteria TEXT,
    is_public INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
)
```

### room_members 表
```sql
CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT NOT NULL,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### photos 表
```sql
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    uploader_id TEXT NOT NULL,
    image_base64 TEXT NOT NULL,
    thumbnail_base64 TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (uploader_id) REFERENCES users(id)
)
```

### tags 表
```sql
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (photo_id) REFERENCES photos(id),
    FOREIGN KEY (creator_id) REFERENCES users(id)
)
```

### scores 表
```sql
CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    criteria_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    round_number INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (photo_id) REFERENCES photos(id),
    FOREIGN KEY (voter_id) REFERENCES users(id)
)
```

### score_rounds 表
```sql
CREATE TABLE IF NOT EXISTS score_rounds (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    results TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
)
```

### 字段类型说明
- `INTEGER`: 整数类型（0或1表示布尔值）
- `TEXT`: 字符串类型
- `REAL`: 浮点数类型
- `PRIMARY KEY`: 主键
- `FOREIGN KEY`: 外键约束
- `UNIQUE`: 唯一约束
- `NOT NULL`: 非空约束
- `DEFAULT`: 默认值

## 认证

### 发送验证码
- **方法**: POST
- **端点**: `/api/auth/send-code`
- **请求头**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "string"
}
```
- **Response**:
```json
{
  "message": "Verification code sent successfully",
  "email": "string"
}
```

### 注册
- **方法**: POST
- **端点**: `/api/auth/register`
- **请求头**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "string",
  "password": "string",
  "code": "string"
}
```
- **Response**:
```json
{
  "message": "Registration successful",
  "email": "string",
  "user_id": "string"
}
```

### 验证邮箱
- **方法**: POST
- **端点**: `/api/auth/verify`
- **请求头**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "string",
  "code": "string"
}
```
- **Response**:
```json
{
  "message": "Email verified successfully",
  "email": "string",
  "user_id": "string"
}
```

### 登录
- **方法**: POST
- **端点**: `/api/auth/login`
- **请求头**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
- **Response**:
```json
{
  "message": "Login successful",
  "token": "string",
  "user_id": "string",
  "email": "string"
}
```

### 重新发送验证码
- **方法**: POST
- **端点**: `/api/auth/resend`
- **请求头**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "string"
}
```
- **Response**:
```json
{
  "message": "Verification code resent successfully",
  "email": "string"
}
```

## 用户资料

### 获取资料
- **方法**: GET
- **端点**: `/api/user/profile`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "id": "string",
  "email": "string",
  "username": "string | null",
  "bio": "string | null",
  "is_verified": boolean
}
```

### 更新资料
- **方法**: PUT
- **端点**: `/api/user/profile`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "username": "string | null",
  "bio": "string | null"
}
```
- **Response**:
```json
{
  "id": "string",
  "email": "string",
  "username": "string | null",
  "bio": "string | null",
  "is_verified": boolean
}
```

## 房间

### 创建房间
- **方法**: POST
- **端点**: `/api/rooms`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "string",
  "description": "string | null",
  "is_public": "boolean | null"
}
```
- **Response**:
```json
{
  "id": "string",
  "owner_id": "string",
  "invite_code": "string",
  "name": "string",
  "description": "string | null",
  "upload_limit": 10,
  "scoring_criteria": null,
  "is_public": false,
  "created_at": "string",
  "member_count": 1,
  "photo_count": 0
}
```

### 获取房间列表（用户的房间）
- **方法**: GET
- **端点**: `/api/rooms`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
[
  {
    "id": "string",
    "owner_id": "string",
    "invite_code": "string",
    "name": "string",
    "description": "string | null",
    "upload_limit": 10,
    "scoring_criteria": null,
    "is_public": false,
    "created_at": "string",
    "member_count": number,
    "photo_count": number
  }
]
```

### 获取房间详情
- **方法**: GET
- **端点**: `/api/rooms/:room_id`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "id": "string",
  "owner_id": "string",
  "invite_code": "string",
  "name": "string",
  "description": "string | null",
  "upload_limit": 10,
  "scoring_criteria": null,
  "is_public": false,
  "created_at": "string",
  "member_count": number,
  "photo_count": number
}
```

### 获取公开房间
- **方法**: GET
- **端点**: `/api/rooms/public`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
[
  {
    "id": "string",
    "owner_id": "string",
    "invite_code": "string",
    "name": "string",
    "description": "string | null",
    "upload_limit": 10,
    "scoring_criteria": null,
    "is_public": true,
    "created_at": "string",
    "member_count": number,
    "photo_count": number
  }
]
```

### 更新房间
- **方法**: PUT
- **端点**: `/api/rooms/:room_id`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "string | null",
  "description": "string | null",
  "upload_limit": number | null,
  "scoring_criteria": {
    "criteria": [
      {
        "name": "string",
        "max_score": number,
        "description": "string | null"
      }
    ]
  } | null
}
```
- **Response**: Same as Get Room Details

### 加入房间（通过邀请码）
- **方法**: POST
- **端点**: `/api/rooms/join`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "invite_code": "string"
}
```
- **Response**: Same as Get Room Details

### 申请加入公开房间
- **方法**: POST
- **端点**: `/api/rooms/join-public`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "room_id": "string"
}
```
- **Response**:
```json
{
  "message": "Application submitted, waiting for approval",
  "room_id": "string"
}
```

### 获取房间成员
- **方法**: GET
- **端点**: `/api/rooms/:room_id/members`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
[
  {
    "user_id": "string",
    "username": "string | null",
    "role": "string",
    "status": "string", // pending, approved, rejected
    "photo_count": number
  }
]
```

### 踢出成员
- **方法**: DELETE
- **端点**: `/api/rooms/:room_id/members/:user_id`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Member kicked successfully"
}
```

### 批准成员加入
- **方法**: POST
- **端点**: `/api/rooms/:room_id/members/:user_id/approve`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Member approved successfully"
}
```

### 拒绝成员加入
- **方法**: POST
- **端点**: `/api/rooms/:room_id/members/:user_id/reject`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Member rejected"
}
```

### 离开房间
- **方法**: POST
- **端点**: `/api/rooms/:room_id/leave`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Left room successfully"
}
```

## 照片

### 上传照片
- **方法**: POST
- **端点**: `/api/rooms/:room_id/photos`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "image_base64": "string"
}
```
- **Response**:
```json
{
  "id": "string",
  "room_id": "string",
  "uploader_id": "string",
  "uploader_name": "string | null",
  "thumbnail_base64": "string",
  "width": number,
  "height": number,
  "created_at": "string",
  "tags": []
}
```

### 获取房间照片
- **方法**: GET
- **端点**: `/api/rooms/:room_id/photos`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
[
  {
    "id": "string",
    "room_id": "string",
    "uploader_id": "string",
    "uploader_name": "string | null",
    "thumbnail_base64": "string",
    "width": number,
    "height": number,
    "created_at": "string",
    "tags": [
      {
        "id": "string",
        "photo_id": "string",
        "creator_id": "string",
        "creator_name": "string | null",
        "x": number,
        "y": number,
        "content": "string",
        "created_at": "string"
      }
    ]
  }
]
```

### 获取照片详情
- **方法**: GET
- **端点**: `/api/photos/:photo_id`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "id": "string",
  "room_id": "string",
  "uploader_id": "string",
  "uploader_name": "string | null",
  "image_base64": "string",
  "width": number,
  "height": number,
  "created_at": "string",
  "tags": [
    {
      "id": "string",
      "photo_id": "string",
      "creator_id": "string",
      "creator_name": "string | null",
      "x": number,
      "y": number,
      "content": "string",
      "created_at": "string"
    }
  ],
  "scores": [
    {
      "id": "string",
      "photo_id": "string",
      "voter_id": "string",
      "voter_name": "string | null",
      "criteria_type": "string",
      "score": number,
      "round_number": number,
      "created_at": "string"
    }
  ]
}
```

### 删除照片
- **方法**: DELETE
- **端点**: `/api/photos/:photo_id`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Photo deleted successfully"
}
```

## 标签

### 创建标签
- **方法**: POST
- **端点**: `/api/tags`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "photo_id": "string",
  "x": number,
  "y": number,
  "content": "string"
}
```
- **Response**:
```json
{
  "id": "string",
  "photo_id": "string",
  "creator_id": "string",
  "creator_name": "string | null",
  "x": number,
  "y": number,
  "content": "string",
  "created_at": "string"
}
```

### 删除标签
- **方法**: DELETE
- **端点**: `/api/tags/:tag_id`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Tag deleted successfully"
}
```

### 获取照片标签
- **方法**: GET
- **端点**: `/api/photos/:photo_id/tags`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
[
  {
    "id": "string",
    "photo_id": "string",
    "creator_id": "string",
    "creator_name": "string | null",
    "x": number,
    "y": number,
    "content": "string",
    "created_at": "string"
  }
]
```

## 评分

### 提交评分
- **方法**: POST
- **端点**: `/api/scores`
- **请求头**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "photo_id": "string",
  "criteria_type": "string",
  "score": number
}
```
- **Response**:
```json
{
  "id": "string",
  "photo_id": "string",
  "voter_id": "string",
  "voter_name": "string | null",
  "criteria_type": "string",
  "score": number,
  "round_number": number,
  "created_at": "string"
}
```

### 获取排行榜
- **方法**: GET
- **端点**: `/api/rooms/:room_id/scoreboard`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "round_number": number,
  "status": "string",
  "scoreboard": [
    {
      "photo_id": "string",
      "uploader_name": "string | null",
      "total_score": number,
      "criteria_scores": {
        "criteria_name": number
      }
    }
  ]
}
```

### 结束回合
- **方法**: POST
- **端点**: `/api/rooms/:room_id/end-round`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Round ended successfully"
}
```

### 开始新回合
- **方法**: POST
- **端点**: `/api/rooms/:room_id/new-round`
- **请求头**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "New round started",
  "round_number": number
}
```

## 错误响应

所有端点都可能返回以下错误响应：

```json
{
  "error": "string"
}
```

常见错误代码：
- `400`: 请求错误（验证错误）
- `401`: 未授权（需要认证或令牌无效）
- `403`: 禁止访问（权限不足）
- `404`: 未找到（资源不存在）
- `500`: 服务器内部错误