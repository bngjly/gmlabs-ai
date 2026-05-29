# ChainGraph · gmlabs.ai

全球 AI 产业链共建图谱 + AI 深度分析平台。

## 当前文件结构

```
gmlabs-ai/
├── index.html      # 落地页 + 4 个 Tab 高保真原型（首页 / 图谱 / AI 分析 / 个人中心）
├── graph.html      # 完整交互式 AI 产业链图谱（11 层 350+ 公司）
├── vercel.json     # Vercel 部署配置 + 安全 headers
└── README.md       # 本文件
```

## 本地预览

直接双击 `index.html`，4 个 Tab 全部可点击。其中：
- 「图谱」Tab 通过 iframe 嵌入 `graph.html`，本地可能因浏览器安全策略不渲染，部署后正常
- 「AI 分析」Tab 是 MU 美光的演示分析页
- 「我的」Tab 是个人中心样例（自选按产业链层级分组）

---

## 部署到 gmlabs.ai 步骤

### 方案一：Vercel CLI 部署（推荐，2 分钟搞定）

```bash
# 1. 全局安装 Vercel CLI
npm i -g vercel

# 2. 进入项目目录
cd "C:\Users\86135\Desktop\WorkSpace\gmlabs-ai"

# 3. 部署（首次会让你登录，浏览器弹窗）
vercel

# 4. 部署到生产
vercel --prod
```

CLI 会问几个问题，回答：
- Set up and deploy? **Y**
- Which scope? **你的用户名**
- Link to existing project? **N**
- Project name? **gmlabs-ai**（或自定义）
- Directory? **./**（默认）
- Override settings? **N**

部署完成后会给你一个临时 URL 如 `gmlabs-ai-xxx.vercel.app`，先用这个测试。

### 方案二：Web 拖拽部署（不用 CLI）

1. 打开 https://vercel.com/new
2. 用 GitHub / Google 登录
3. 选 "Import from..." → "Other" → 直接把 `gmlabs-ai` 文件夹拖到页面上
4. Framework Preset 选 **Other**
5. Click Deploy

---

## 绑定 gmlabs.ai 域名

部署成功后：

### 1. 在 Vercel Dashboard 添加域名

打开你的项目 → **Settings → Domains** → 输入：
- `gmlabs.ai`
- `www.gmlabs.ai`

Vercel 会显示要在哪个 DNS 记录上做什么。

### 2. 在你的域名注册商（Namecheap/Cloudflare/阿里云等）配置 DNS

#### 选项 A：用 Vercel Nameservers（最简单）
把 gmlabs.ai 的 nameservers 改为：
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```
所有 DNS 由 Vercel 接管。

#### 选项 B：保留现有 DNS 服务商，只加记录（推荐）

| 类型 | 主机记录 | 值 | TTL |
|---|---|---|---|
| **A** | @ | `76.76.21.21` | Auto |
| **CNAME** | www | `cname.vercel-dns.com` | Auto |

如果你的 DNS 在 **Cloudflare**：
- 进 Cloudflare → 选 gmlabs.ai → DNS → Records → Add record
- 注意：A 记录的 Proxy status **必须关掉橙色云**（DNS only），否则 Vercel SSL 证书签发会失败
- 等 1-5 分钟，回 Vercel Dashboard 看域名状态变成绿色 ✅

#### 验证
```bash
# 全球 DNS 传播检测（Windows PowerShell）
nslookup gmlabs.ai
# 应该返回 76.76.21.21
```

或在浏览器访问 https://dnschecker.org/ 输入 `gmlabs.ai` 查看全球 DNS 状态。

### 3. SSL 证书

Vercel 自动签发 Let's Encrypt 证书，**5-10 分钟内**生效，无需任何操作。

---

## 成本

| 项 | 费用 | 备注 |
|---|---|---|
| Vercel Hosting | $0 | Hobby 免费档完全够用（100GB/月带宽） |
| 域名 gmlabs.ai | 已付 | 你已购买 |
| SSL 证书 | $0 | Vercel 自动签发 |
| **当前月成本** | **$0** | 真实数字 |

---

## 下一步路线图

### Phase 1.5（1-2 周）
- [ ] 接 Cloudflare Analytics（免费，匿名 PV 统计）
- [ ] 加 Open Graph 元信息（分享到推特/微信卡片）
- [ ] 在 `index.html` 顶部加一个 "登记邮件订阅更新" 表单（用 Formspree 免费档）

### Phase 2（1-2 个月）
- [ ] 改造成 Next.js（保留所有 UI）
- [ ] 接 Neon Postgres 存储图谱数据
- [ ] NextAuth.js 登录（Google + Email）
- [ ] 真实"个人自选"持久化

### Phase 3（3-4 个月）
- [ ] AI 分析功能上线（Claude API + Stripe 计费）
- [ ] PR 工作流 + 社区投票
- [ ] Pro 订阅 + API 充值
