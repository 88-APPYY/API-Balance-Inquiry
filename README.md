# API Balance Tracker

统一查询与管理 AI 大模型 API 余额及 Token 用量趋势的开源工具。


[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 功能特性

- **余额查询** — 实时获取 API 账户可用余额和历史总消耗
- **用量趋势** — 近 7 天 Token 消耗趋势图表（柱状图 + 费用折线）
- **每日快照** — 本地记录每日用量快照，长期累积后获得真实日增量
- **安全加密** — API Key 和平台 Cookie 采用 AES-256-GCM 加密存储
- **插件架构** — Provider 模式设计，支持扩展不同服务商

## 支持的服务商

| 服务商          | 状态        |
| --------------- | ----------- |
| DeepSeek        | ✅ 已支持   |
| OpenAI          | 🚧 即将支持 |
| 智谱 (ZhiPu)    | 🚧 即将支持 |
| 百川 (BaiChuan) | 🚧 即将支持 |

## 技术栈

| 类别   | 技术                         |
| ------ | ---------------------------- |
| 框架   | Next.js 16 (App Router)      |
| 语言   | TypeScript                   |
| 数据库 | SQLite + Prisma ORM          |
| 样式   | Tailwind CSS + shadcn/ui     |
| 图表   | Recharts                     |
| 加密   | Node.js crypto (AES-256-GCM) |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/api-balance-tracker.git
cd api-balance-tracker
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL="file:./dev.db"

# 生成你自己的加密密钥：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your_64_hex_chars_encryption_key_here"
```

### 3. 初始化数据库

```bash
npx prisma db push
```

### 4. 启动

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，进入仪表盘。

## 使用指南

### 添加 API Key

1. 在仪表盘点击「添加 Key」
2. 填写 Key 名称、API Key（Bearer Token）
3. **（可选）平台 Cookie**：如果访问 `platform.deepseek.com` 被 WAF 拦截，需要提供浏览器的 Cookie（加密存储，不会泄露）
4. 保存后点击「刷新」即可查询余额和用量

### 获取平台 Cookie

部分 API 端点需要对浏览器 Cookie 进行 WAF 校验。获取方式：

1. 浏览器打开 `https://platform.deepseek.com` 并登录
2. 打开 DevTools → Application → Cookies
3. 复制所有 Cookie 值，粘贴到表单的「平台 Cookie」字段

### 每日用量趋势

- **首次查询**：系统保存当月累计快照，趋势为月度估算（黄色徽章标注）
- **持续使用**：每次查询保存快照，相邻快照差值 = 真实日用量。≥2 个快照后显示真实趋势（绿色徽章）

## 项目结构

```
src/
├── app/
│   ├── page.tsx                   # 首页
│   ├── layout.tsx                 # 根布局
│   ├── dashboard/page.tsx         # 仪表盘
│   └── api/
│       ├── keys/route.ts          # API Key 管理
│       ├── balance/route.ts       # 余额查询
│       └── usage/
│           ├── route.ts           # 用量查询 + 快照
│           └── trend/route.ts     # 本地趋势数据
├── components/
│   ├── dashboard/
│   │   ├── ApiKeyForm.tsx         # 添加 Key 表单
│   │   ├── BalanceCard.tsx        # 余额卡片
│   │   ├── UsageChart.tsx         # 用量图表
│   │   └── RecentCalls.tsx        # 查询历史
│   └── ui/                        # shadcn/ui 组件
├── lib/
│   ├── db.ts                      # Prisma 客户端
│   ├── crypto.ts                  # 加密/解密工具
│   ├── daily-snapshot.ts          # 快照 CRUD + 趋势计算
│   └── utils.ts                   # 通用工具
└── providers/
    ├── IProvider.ts               # Provider 接口
    ├── registry.ts                # Provider 注册表
    ├── types.ts                   # 类型定义
    └── deepseek/index.ts          # DeepSeek Provider
```

## 安全模型

- **客户端零接触**：API Key 加密存储于服务端，浏览器端只接收脱敏前缀
- **AES-256-GCM**：业界标准对称加密，密钥通过环境变量注入
- **软删除**：删除 Key 不物理删除数据，便于审计追溯

## 扩展 Provider

实现 `IProvider` 接口，注册到 `ProviderRegistry`：

```typescript
import { IProvider, ProviderType, ProviderRegistry } from "@/providers";

class MyProvider implements IProvider {
  readonly type = ProviderType.OpenAI;
  
  async initialize(config: ProviderConfig): Promise<void> { /* ... */ }
  async getBalance(): Promise<BalanceResponse> { /* ... */ }
  async getUsage(options?): Promise<UsageResponse> { /* ... */ }
  async validateApiKey(): Promise<boolean> { /* ... */ }
}

ProviderRegistry.register(ProviderType.OpenAI, MyProvider);
```

## License

MIT © [Your Name]
