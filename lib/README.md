# 第三方库文件夹

这个文件夹用于存放插件的第三方 JavaScript 库文件。

## 推荐的文件结构

```
lib/
├── jquery/
│   ├── jquery.min.js
│   └── jquery.min.map
├── lodash/
│   ├── lodash.min.js
│   └── lodash.min.map
├── moment/
│   ├── moment.min.js
│   └── locales/
├── axios/
│   └── axios.min.js
└── README.md
```

## 使用说明

### 1. 在 manifest.json 中引用
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "lib/jquery/jquery.min.js",
        "lib/lodash/lodash.min.js",
        "content.js"
      ]
    }
  ]
}
```

### 2. 在 HTML 中引用
```html
<script src="lib/jquery/jquery.min.js"></script>
<script src="lib/lodash/lodash.min.js"></script>
<script src="popup.js"></script>
```

### 3. 在 background.js 中引用
```javascript
// 在 manifest.json 的 background.scripts 中添加
"background": {
  "service_worker": "background.js",
  "scripts": [
    "lib/lodash/lodash.min.js",
    "background.js"
  ]
}
```

## 注意事项

1. **文件大小限制**: Chrome 插件有文件大小限制，建议使用压缩版本
2. **版本管理**: 建议在文件夹名中包含版本号，如 `jquery-3.6.0/`
3. **许可证**: 确保第三方库的使用符合其许可证要求
4. **安全性**: 只使用可信的第三方库，避免安全风险
5. **更新**: 定期更新第三方库以修复安全漏洞

## 推荐的轻量级库

- **jQuery**: DOM 操作和 AJAX
- **lodash**: 实用工具函数
- **moment.js**: 日期时间处理
- **axios**: HTTP 请求
- **dayjs**: 轻量级日期库（moment.js 的替代品）
- **uuid**: UUID 生成 