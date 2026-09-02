# the-scripts-of-my-own 个人阅读优化脚本
用于改善长篇中文内容与墨水屏设备阅读体验的个人 Userscript。

目前包含：

| 脚本名 | 原作者 | 修改者 | 优化项 |
|---|---|---|---|
| **AO3 Site Wizard - 墨水屏优化版** | [BlackBatCat](https://github.com/Wolfbatcat) | Syoius | 在线中文字体、中文排版、空行清理、高对比度阅读等 |
| **随缘居论坛阅读优化 - 墨水屏触控版** | Syoius | Syoius | 论坛首页与列表触控优化、跨分页只看帖主、中文字体与排版、专注阅读、高对比度 |

## Installation 安装方法

1. 安装浏览器插件 Tampermonkey（或 Violentmonkey），或使用支持脚本的浏览器（如 Via浏览器）。墨水屏设备上可直接使用 [EinkBro 浏览器](https://github.com/plateaukao/einkbro/releases) 或 [Via 浏览器](https://viayoo.com/zh-cn/)，不需额外安装插件。
2. 选择需要的脚本安装：
   - [AO3 Site Wizard（墨水屏优化版）](https://greasyfork.org/zh-CN/scripts/593728-ao3-site-wizard-zh-cn-e-ink-reader-optimised)
   - [随缘居论坛阅读优化 - 墨水屏触控版](https://greasyfork.org/zh-CN/scripts/593907-mtslash-forum-reader-e-ink-touch-optimized)（打开文件后通过脚本管理器安装）
3. 安装并启用脚本后，打开或刷新对应站点页面即可生效

P.S. AO3 脚本当前主要匹配：
`https://archiveofourown.org/*` 和 `https://*.archiveofourown.org/*`。暂不支持镜像站点。

## Scripts 功能介绍
### AO3 Site Wizard 墨水屏优化版
- 中文字体：设置项与面板一致，支持 `系统`、[霞鹜文楷](https://github.com/CMBill/lxgw-wenkai-screen-web)（默认）、[屏显臻宋](https://fontsapi.zeoseven.com/79/main/result.css)、[寒蝉锦书宋 Pro](https://fontsapi.zeoseven.com/2246/main/result.css)、[京华老宋体](https://fontsapi.zeoseven.com/309/main/result.css)、[芝士奶盖乌龙](https://fontsapi.zeoseven.com/2328/main/result.css)、[寒蝉正楷体](https://fontsapi.zeoseven.com/5/main/result.css)、[更纱黑体](https://fontsapi.zeoseven.com/214/main/result.css)、[上图东观](https://fontsapi.zeoseven.com/488/main/result.css)和 `自定义`；京华老宋体、寒蝉正楷体固定使用 `600` 字重，其余预设使用 `400`，自定义字体可自行勾选 `600` 加粗；除默认文楷外，网络字体仅在选中后加载
- 西文字体：可独立选择 `跟随中文`（默认）、[Atkinson Hyperlegible](https://www.jsdelivr.com/package/npm/%40fontsource/atkinson-hyperlegible)、[Google Sans](https://fontsapi.zeoseven.com/912/main/result.css)、[Merriweather](https://fontsapi.zeoseven.com/682/main/result.css)、[Literata](https://www.jsdelivr.com/package/npm/%40fontsource/literata)或 [Source Serif 4](https://www.jsdelivr.com/package/npm/%40fontsource/source-serif-4)；选中的西文字体会排在字体栈最前，优先显示英文、数字和西文标点，不包含的字符自动回落到所选中文字体；额外字体同样按需加载
- 中文排版：可以直接调整 `正文字号`、`行高`、`字间距`、`段间距`、`正文宽度`、`首行缩进`、`两端对齐`，根据中文阅读习惯设置了默认值；启用首行缩进时会先可逆地清除原文段首空格，避免与统一的 `2em` 缩进叠加
- 自动清理空行：配合段间距使用，保证排版统一
- 中英文间距：可自动在中文、常见中英文标点与英文/半角数字之间添加窄空格
- 下一章加载模式：可选择 `无`、`无缝加载`（滚动到章节末尾前自动把下一章接在正文后面）或 `下一页预载入`（仅向浏览器发出缓存提示）；无缝加载会同步最新章节的地址、标题、评论及正文后区域，刷新后回到最新章节标题，加载失败时仍可使用原来的章节链接
- 更新提醒：设置面板标题显示当前版本；每 7 天在后台检查一次 Greasy Fork，发现新版本时显示可关闭的页面提示，并在标题旁保留可点击的极简更新入口
- 面板最小化：可将设置面板收起为页面右下角的 `Aa` 浮动按钮，切换页面后仍会保留，随时点击恢复；展开或关闭面板会清除该状态
- 双侧整页翻页：可选显示专为 6～7 寸墨水屏设备设计的双侧翻页栏；左右各约 32px 宽，上半屏为上翻、下半屏为下翻，仅显示箭头图标且按下不变色；页面只预留窄边栏，翻页时关闭滚动动画并保留约一行上下文
- 高对比度模式：强制纯白背景+纯黑文字，提升墨水屏显示效果
- 可选：隐藏作者 Notes 等额外信息
- 快捷键：`Shift + Alt + W` 快速打开或关闭设置面板。

设置会同时写入脚本管理器提供的 GM Storage 和当前 AO3 站点的 `localStorage`，并以时间戳较新的有效副本为准。`localStorage` 作为 EinkBro 等 GM 存储实现不完整时的兼容回退；刷新页面或重新打开 AO3 后，之前的设置仍会继续生效。

### 随缘居论坛阅读优化 - 墨水屏触控版

- 只看帖主：自动识别当前主题帖主；切换模式时会从当前视口最近的未读楼层继续，再次点击即可查看全部
- 无缝加载：可在接近页面末尾时同源加载主题下一页，保留只看帖主与手机模板参数，按帖子 ID 去重，并用页码分隔连续内容；失败时提供普通下一页链接
- 整页翻页：可显示墨水屏友好的左右双侧翻页键，每侧上、下半区分别即时向上或向下移动一屏，并保留一行上下文作为阅读衔接
- 末尾返回：回复内容结束后显示返回上级列表按钮；优先恢复实际来源的子版面、主题分类／分类信息筛选和列表页码，来源不可用时回退到主题分类链接或最深层面包屑
- 模板兼容：适配 X3.2 默认电脑版（`#postlist`）、标准手机版 / XHTML（`.vt`）和触屏版（`.postlist`）三套主题模板
- 论坛首页：为 手机标准版 首页提供墨水屏目录式布局
- 版面列表：为电脑版、手机标准版和触屏版主题列表提供墨水屏高对比度排版；移动视图会把子版块、主题分类与分类信息移到主题列表之前；已选分类可再次点击取消，页码及上一页／下一页提供触控友好的大按钮
- 专注布局：将传统左右两栏帖子改成单栏阅读卡片，保留作者、时间、楼层和帖主标记，隐藏作者侧栏与帖子操作栏
- 中文字体：支持 `系统`、霞鹜文楷（默认）、屏显臻宋、寒蝉锦书宋 Pro、京华老宋体、芝士奶盖乌龙、寒蝉正楷体、更纱黑体、上图东观和自定义字体；网络字体仅在选中后加载
- 中文排版：可调整正文字号、行高、字间距、段间距和正文宽度，并可切换首行缩进、两端对齐、中英文间距与连续空行清理
- 墨水屏模式：默认提供纯白背景、纯黑文字和清晰边框，也可在设置中关闭高对比度
- 其他：可隐藏签名；设置面板使用隔离样式和一屏紧凑布局，不依赖面板滚动，打开时锁定后方正文；同时支持键盘操作、移动端安全边距和 `prefers-reduced-motion`
- 快捷键：`Shift + Alt + D` 打开或关闭设置面板

此 Discuz 脚本仅匹配 `*://www.mtslash.life/*`，兼容该域名的 HTTP 与 HTTPS 页面；并且只有在检测到完整的 Discuz 主题、版面列表或 `mobile=1` 论坛首页 DOM 后才会启动。

Discuz 阅读设置优先写入脚本管理器的 GM Storage，并同步保存到当前论坛的 `localStorage` 作为兼容回退；识别出的帖主 UID 仅按论坛主题 ID 缓存。
