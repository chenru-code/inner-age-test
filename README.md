# Inner Age 心理年龄测试 — EdgeOne Makers

面向 EdgeOne Makers 的静态前端 + Pages Functions + KV 版本。

## 腾讯云部署配置

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

EdgeOne KV binding enabled.
