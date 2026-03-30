# Memos 模块 E2E 测试覆盖

## 模块概述

**路由**: `/login`, `/`

## 功能清单与测试覆盖

| 功能点     | 描述                               | 优先级 | 状态 | 测试文件         |
| ---------- | ---------------------------------- | ------ | ---- | ---------------- |
| 登录重定向 | 未登录访问首页时跳转登录页         | P0     | ✅   | `auth.feature`   |
| UI 登录    | 已存在账号登录后进入 memo 列表     | P0     | ✅   | `auth.feature`   |
| 创建 Memo  | 已登录用户创建 memo 并出现在列表中 | P0     | ✅   | `crud.feature`   |
| 标签筛选   | 用户按标签过滤 memo 列表           | P1     | ✅   | `filter.feature` |

## 测试执行

```bash
cd allinone && docker compose up -d
cd ../memos && VITE_API_BASE_URL=http://127.0.0.1:2910/api/v1 vp dev --port 3000
cd ../memos && vp install
cd ../memos && vp run e2e:cleanup
cd ../memos && BASE_URL=http://127.0.0.1:3000 API_BASE_URL=http://127.0.0.1:2910/api/v1 vp run e2e:dry-run
cd ../memos && BASE_URL=http://127.0.0.1:3000 API_BASE_URL=http://127.0.0.1:2910/api/v1 vp run e2e:test -- --tags "@P0"
cd ../memos && BASE_URL=http://127.0.0.1:3000 API_BASE_URL=http://127.0.0.1:2910/api/v1 vp run e2e:test -- --tags "@P1"
```
