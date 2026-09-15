# Inner Age 心理年龄测试

Next.js 静态前端 + CloudBase HTTP 云函数 + CloudBase PostgreSQL。旧 EdgeOne Functions 保留用于回滚。

## CloudBase 部署（推荐）

1. 在「SQL 型数据库 → SQL 编辑器」执行 `cloudbase/schema.sql`。
2. 在「SQL 型数据库 → 配置 → API 密钥」创建 `service_role` 服务端密钥。
3. 创建 HTTP 云函数 `inner-age-api`，代码目录选择 `cloudfunctions/inner-age-api`，运行时 Node.js 18；函数必须监听 9000 端口。
4. 为云函数配置以下加密环境变量：
   - `CLOUDBASE_ENV_ID=inner-age-test-d9gb4g5uk995d5605`
   - `CLOUDBASE_API_KEY=你的 service_role API 密钥`
   - `ADMIN_SECRET=管理员强密码`
   - `SESSION_SECRET=至少 40 位随机字符串`
5. 在 HTTP 网关添加 `/api/*` 路由，后端指向 `inner-age-api`；将 `/*` 指向静态网站托管。
6. 静态前端执行 `npm install && npm run build`，上传 `out` 目录。
7. 访问同一网关域名的 `/api/health`，应返回 `{"status":"ok","database":"available"}`。

不要把 `CLOUDBASE_API_KEY`、`ADMIN_SECRET` 或 `SESSION_SECRET` 放到前端、GitHub 或 `NEXT_PUBLIC_*` 变量中。RLS 表不需要面向匿名用户创建放行策略，数据库仅由服务端 `service_role` 密钥访问。

`cloudbaserc.json` 可供 CloudBase CLI 部署使用；控制台手工部署时按上述参数填写即可。

## EdgeOne Makers 旧版部署

1. 在 EdgeOne Makers 导入此 GitHub 仓库，生产分支选择 `main`。
2. 构建框架选择 Next.js，Node.js 22。
3. 安装命令：`npm install`
4. 构建命令：`npm run build`
5. 输出目录：`out`
6. 创建 KV 命名空间并绑定到项目，变量名必须是 `INNER_AGE_KV`。
7. 在项目环境变量中创建两个不同的加密变量：
   - `ADMIN_SECRET`：管理后台密码
   - `SESSION_SECRET`：至少 40 位随机字符串，仅用于签名会话
8. 重新部署生产环境。

## 路由

- `/`：测试首页
- `/admin/`：邀请码管理后台
- `/api/invite`：邀请码验证与设备绑定
- `/api/result`：服务端评分
- `/api/admin/session`：管理员短期会话
- `/api/admin/invites`：邀请码管理
- `/api/health`：健康检查

## 存储说明

邀请码、设备摘要、限流状态和审计日志保存在 EdgeOne KV。生日、答案和测试报告不写入 KV。

EdgeOne KV 是最终一致性存储，跨边缘节点同步最长可能约 60 秒。当前实现适合小范围销售验证；大规模商业投流前，应把邀请码首次绑定和计数迁移到支持事务的强一致数据库。
