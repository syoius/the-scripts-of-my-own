# the-scripts-of-my-own 个人用 AO3 脚本
用于改善 [Archive of Our Own (AO3)](https://archiveofourown.org/) 在墨水屏设备上阅读体验的个人用 Userscript。

目前包含：
| 脚本名 | 原作者 | 修改者 | 优化项 |
|---|---|---|---|
| **AO3 Site Wizard - 墨水屏优化版** | [BlackBatCat](https://github.com/Wolfbatcat) | Syoius | 在线中文字体、中文排版、空行清理、高对比度阅读等 |

## Installation 安装方法

1. 安装浏览器插件 Tampermonkey（或 Violentmonkey），或使用支持脚本的浏览器（如 Via浏览器）。墨水屏设备上可直接使用 [EinkBro 浏览器](https://github.com/plateaukao/einkbro/releases) 或 [Via 浏览器](https://viayoo.com/zh-cn/)，不需额外安装插件。
2. 点击链接安装脚本 ➡️ [点击这里安装 AO3 Site Wizard（墨水屏优化版）](https://greasyfork.org/zh-CN/scripts/593728-ao3-site-wizard-zh-cn-e-ink-reader-optimised)
3. 安装并启用脚本后，打开或刷新 ao3 相关页面即可生效

P.S. 当前脚本主要匹配：
`https://archiveofourown.org/*` 和 `https://*.archiveofourown.org/*`。暂不支持镜像站点。

## Scripts 功能介绍
### AO3 Site Wizard 墨水屏优化版
- 自定义字体：全站字体默认使用[霞鹜文楷屏幕阅读版](https://github.com/lxgw/LxgwWenKai-Screen)，无须专门安装字体即可直接使用
- 中文排版：可以直接调整 `正文字号`、`行高`、`字间距`、`段间距`、`正文宽度`、`首行缩进`、`两端对齐`，根据中文阅读习惯设置了默认值
- 自动清理空行：配合段间距使用，保证排版统一
- 中英文间距：可自动在相邻的中文、英文及半角数字之间添加空格
- 高对比度模式：强制纯白背景+纯黑文字，提升墨水屏显示效果
- 可选：隐藏作者 Notes 等额外信息
- 快捷键：`Shift + Alt + W` 快速打开或关闭设置面板。

设置会同时写入脚本管理器提供的 GM Storage 和当前 AO3 站点的 `localStorage`，并以时间戳较新的有效副本为准。`localStorage` 作为 EinkBro 等 GM 存储实现不完整时的兼容回退；刷新页面或重新打开 AO3 后，之前的设置仍会继续生效。
