
HiPhoto/
├── hiphoto-backend/                 # Rust 后端
│   ├── Cargo.toml
│   ├── .env
│   ├── .env.example
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── config.rs                # 配置管理
│       ├── db.rs                    # 数据库连接
│       ├── error.rs                 # 错误处理
│       ├── models/                  # 数据模型
│       │   ├── mod.rs
│       │   ├── user.rs
│       │   ├── room.rs
│       │   ├── photo.rs
│       │   ├── tag.rs
│       │   └── score.rs
│       ├── handlers/                # API 处理器
│       │   ├── mod.rs
│       │   ├── auth.rs
│       │   ├── user.rs
│       │   ├── room.rs
│       │   ├── photo.rs
│       │   ├── tags.rs
│       │   └── score.rs
│       ├── services/                # 业务逻辑
│       │   ├── mod.rs
│       │   ├── auth.rs
│       │   ├── email.rs
│       │   ├── image.rs
│       │   └── room.rs
│       ├── middleware/              # 中间件
│       │   ├── mod.rs
│       │   └── auth.rs
│       └── utils/                   # 工具函数
│           ├── mod.rs
│           └── jwt.rs
│
└── hiphoto-frontend/                # React 前端
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── vite-env.d.ts
        ├── api/                     # API 请求
        │   ├── index.ts
        │   ├── auth.ts
        │   ├── room.ts
        │   ├── photo.ts
        │   └── score.ts
        ├── components/              # 组件
        │   ├── Layout.tsx
        │   ├── Navbar.tsx
        │   ├── ProtectedRoute.tsx
        │   ├── PhotoViewer.tsx      # 图片查看器（标签功能）
        │   ├── PhotoUploader.tsx
        │   ├── RoomCard.tsx
        │   └── ScoreBoard.tsx
        ├── pages/                   # 页面
        │   ├── Home.tsx
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── VerifyEmail.tsx
        │   ├── Profile.tsx
        │   ├── RoomList.tsx
        │   ├── RoomDetail.tsx
        │   └── PhotoDetail.tsx
        ├── hooks/                   # 自定义 Hooks
        │   ├── useAuth.ts
        │   └── usePhoto.ts
        ├── stores/                  # 状态管理
        │   └── authStore.ts
        └── types/                   # TypeScript 类型
            └── index.ts

