# 企业信息爬虫
## 工具
 puppeteer、expressJS
 
## 进度
1. 企查查基本信息 √
2. 法院文书 √
3. 信用中国 (使用stealth 插件也无法通过bot验证)

## 企查查登录账户配置
1. 添加configs目录
2. 添加qcc-accounts.js
3. 添加代码：
```javascript
module.exports = [
    {"user": "用户名", "password": "密码"},
];

```
