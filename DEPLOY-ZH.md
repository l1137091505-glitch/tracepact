# TRACEPACT 部署步骤

## 一、上传到 GitHub

1. 新建一个空仓库，建议仓库名：`tracepact`。
2. 解压项目压缩包，把解压后的全部文件上传到仓库根目录。
3. Commit message 可填写：`Initial TRACEPACT project`。

## 二、先部署前端预览

1. 在 Vercel 选择 **Add New → Project**。
2. 导入刚创建的 GitHub 仓库。
3. **Root Directory** 选择 `frontend`。
4. Framework Preset 选择 **Vite**，然后 Deploy。

这时网站会显示 `PREVIEW LEDGER`，可以先检查页面与交互。

## 三、部署合约

1. 打开 Remix，新建 `TracePact.sol`。
2. 复制 `contracts/src/TracePact.sol` 的全部内容。
3. 使用 Solidity `0.8.24` 或兼容的新版本编译。
4. Deploy & Run 中连接你的浏览器钱包，并确认网络。
5. 部署 `TracePact`，这个合约没有构造参数。
6. 钱包确认交易后，复制合约地址。

请先用少量资产和测试记录检查流程。未经专业审计，不要将其用于高价值或法律关键用途。

## 四、把合约地址接入 Vercel

在 Vercel 项目中打开 **Environment Variables**，添加：

```text
Key: VITE_TRACEPACT_ADDRESS
Value: 你刚部署的 0x 合约地址
```

选择 Production、Preview、Development。合约地址本来就是公开信息，所以变量类型可以选择 **Config**。保存后点 **Redeploy**。

## 五、真实交互顺序

1. 作者钱包在 **New pact** 创建任务。
2. 同一个作者钱包在 **Records → Attach evidence** 添加成果证据。
3. 审核证据后，在证据页下方的 **Close the loop** 表单记录结果并关闭任务。
4. 任何人都可在 **Verify** 输入编号读取公开时间线，无需连接钱包。

钱包切换后页面会自动重新读取当前账户；如果钱包未切到正确网络，网站会请求切换到 BOT Chain。

