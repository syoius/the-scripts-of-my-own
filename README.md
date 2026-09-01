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
- 中文字体：可选择系统字体、[霞鹜文楷屏显版](https://github.com/lxgw/LxgwWenKai-Screen)（默认）、[屏显臻宋](https://fontsapi.zeoseven.com/79/main/result.css)、[寒蝉锦书宋 Pro](https://fontsapi.zeoseven.com/2246/main/result.css)、[京华老宋体](https://fontsapi.zeoseven.com/309/main/result.css)、[芝士奶盖乌龙](https://fontsapi.zeoseven.com/2328/main/result.css)、[寒蝉正楷体](https://fontsapi.zeoseven.com/5/main/result.css)、[更纱黑体 UI](https://fontsapi.zeoseven.com/214/main/result.css)、[上图东观体](https://fontsapi.zeoseven.com/488/main/result.css)，或自行填写 `font-family`；预设字体使用各自固定字重，自定义字体可勾选 `600` 加粗，额外的网络字体仅在选中时加载
- 西文字体：可独立选择跟随正文字体（默认）、[Atkinson Hyperlegible](https://www.jsdelivr.com/package/npm/%40fontsource/atkinson-hyperlegible)、[Google Sans](https://fontsapi.zeoseven.com/912/main/result.css)、[Merriweather](https://fontsapi.zeoseven.com/682/main/result.css)、[Literata](https://www.jsdelivr.com/package/npm/%40fontsource/literata) 或 [Source Serif 4](https://www.jsdelivr.com/package/npm/%40fontsource/source-serif-4)；独立西文字体优先处理英文、数字和西文标点，中文自动回落到所选中文字体
- 中文排版：可以直接调整 `正文字号`、`行高`、`字间距`、`段间距`、`正文宽度`、`首行缩进`、`两端对齐`，根据中文阅读习惯设置了默认值
- 自动清理空行：配合段间距使用，保证排版统一
- 中英文间距：可自动在中文、常见中英文标点与英文/半角数字之间添加窄空格
- 下一章加载模式：可选择 `无`、`无缝加载`（滚动到章节末尾前自动把下一章接在正文后面）或 `下一页预载入`（仅向浏览器发出缓存提示）；无缝加载会同步最新章节的地址、标题、评论及正文后区域，刷新后回到最新章节标题，加载失败时仍可使用原来的章节链接
- 更新提醒：设置面板标题显示当前版本；每 7 天在后台检查一次 Greasy Fork，发现新版本时显示可关闭的页面提示，并在标题旁保留可点击的极简更新入口
- 面板最小化：可将设置面板收起为页面右下角的 `Aa` 浮动按钮，切换页面后仍会保留，随时点击恢复；展开或关闭面板会清除该状态
- 高对比度模式：强制纯白背景+纯黑文字，提升墨水屏显示效果
- 可选：隐藏作者 Notes 等额外信息
- 快捷键：`Shift + Alt + W` 快速打开或关闭设置面板。

设置会同时写入脚本管理器提供的 GM Storage 和当前 AO3 站点的 `localStorage`，并以时间戳较新的有效副本为准。`localStorage` 作为 EinkBro 等 GM 存储实现不完整时的兼容回退；刷新页面或重新打开 AO3 后，之前的设置仍会继续生效。
