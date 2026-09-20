# samples｜测试样例

该目录提供一组脱敏、自制、可直接用于 FinGuard 页面测试的金融销售对话样例。

## 目录说明

### 01–09：核心业务样例

- `01-normal-compliant.txt`：正常合规对话
- `02-guaranteed-return.txt`：明确保本保收益
- `03-role-attribution.txt`：客户说出敏感话术，验证角色归因
- `04-negation.txt`：明确否定表达
- `05-negation-but-risk.txt`：否定 + 转折 + 隐性承诺
- `06-account-security.txt`：验证码 + 代客操作
- `07-suitability-review.txt`：明确适当性判断，但证据不足
- `08-suitability-pass.txt`：客户表达风险偏好，销售正确处理
- `09-multi-risk.txt`：综合多风险对话

这些样例与 `TEST_CASES.md` 中的真实模型回归 Case 保持一致。

`samples/` 仅保存测试输入，不重复记录预期结果、实际结果和错误分析。完整测试过程请查看项目根目录下的 `TEST_CASES.md`。

## 批量测试

`batch-samples.csv` 使用固定格式：

```csv
id,dialogue
```

每一行代表一段独立对话，可直接用于批量质检功能。

当前 CSV 中选取了 6 个具有代表性的核心 Case，包括：

- 正常合规
- 明确保本保收益
- 角色归因
- 否定表达
- 账户安全
- 综合多风险

## edge-cases

`edge-cases/` 用于存放扩展鲁棒性测试，不属于普通金融业务样例。

- `dialogue-prompt-injection.txt`：验证对话中的 Prompt Injection 不会改变质检任务
- `custom-rule-prompt-injection.txt`：验证自定义规则既能作为业务规则执行，又不能通过规则说明越权修改系统任务

运行 `custom-rule-prompt-injection.txt` 前，请先按文件内说明配置对应自定义规则，并清空其他自定义规则，避免测试状态污染。

## 使用方式

单条测试：

1. 打开 FinGuard 单条质检页面；
2. 直接复制任意 `.txt` 文件中的对话；
3. 粘贴至输入框并开始分析。

TXT 导入：

直接选择任意核心 `.txt` 文件上传。

批量测试：

上传 `batch-samples.csv`。

## 说明

以上内容均为自制测试文本，不包含真实客户数据、账号、密码、API Key 或其他隐私信息。
