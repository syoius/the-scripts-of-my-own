// ==UserScript==
// @name         MTSlash Forum Reader - E-Ink & Touch Optimized
// @name:zh-CN   随缘居论坛阅读优化 - 墨水屏触控版
// @namespace    https://github.com/syoius/the-scripts-of-my-own
// @version      1.4.0
// @description  Reflows Discuz! X3.2 forum indexes, lists, and threads with touch navigation, owner filtering, pagination, Chinese typography, and e-ink contrast.
// @description:zh-CN  为 Discuz! X3.2 论坛首页、版面与主题页提供触控导航、只看帖主、翻页、中文排版及墨水屏高对比度优化。
// @author       syoius
// @match        *://www.mtslash.life/*
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

/*
 * Discuz! X3.2 Reader - ZH-CN & E-Ink Edition
 *
 * This build is scoped to www.mtslash.life. It still exits before adding
 * styles, observers, or UI unless the page contains a characteristic Discuz
 * thread, forum-listing, or mobile forum-index DOM.
 *
 * The original-poster-only link uses Discuz's native `authorid` query. This
 * means filtering happens on the server and continues to work across pages.
 *
 * External font presets are loaded only after they are selected. Their URLs
 * follow the font choices used by this repository's AO3 reading script.
 */

(function () {
    'use strict';

    const SCRIPT_ID = 'dzr';
    const STORAGE_KEY = 'discuz_x32_reader_settings';
    const OWNER_CACHE_PREFIX = 'discuz_x32_reader_owner_';
    const OWNER_POSITION_PREFIX = 'discuz_x32_reader_position_';
    const ROOT_ENABLED_CLASS = 'dzr-enabled';
    const ROOT_FOCUS_CLASS = 'dzr-focus';
    const ROOT_CONTRAST_CLASS = 'dzr-high-contrast';
    const ROOT_PAGE_TURN_CLASS = 'dzr-page-turn-enabled';
    const ROOT_INSTANT_TURN_CLASS = 'dzr-instant-page-turn';
    const ROOT_FORUM_CLASS = 'dzr-forum-listing';
    const ROOT_FORUM_INDEX_CLASS = 'dzr-forum-index';
    const ROOT_MOBILE_FORUM_CLASS = 'dzr-forum-mobile';
    const WRAPPED_ROOT_CLASS = 'dzr-br-paragraphs';
    const ROOT_PARAGRAPH_CLASS = 'dzr-root-paragraph';
    const LINE_CLASS = 'dzr-br-line';
    const SEAMLESS_SENTINEL_ID = 'dzr-seamless-sentinel';
    const SEAMLESS_BOUNDARY_CLASS = 'dzr-page-boundary';
    const RETURN_FOOTER_ID = 'dzr-return-footer';
    const FORUM_TOP_ID = 'dzr-forum-top';
    const FORUM_SECTION_CLASS = 'dzr-forum-section';

    const FONT_PRESETS = {
        system: {
            label: '系统字体',
            family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
            weight: '400'
        },
        wenkai: {
            label: '霞鹜文楷',
            family: '"LXGW WenKai GB Screen", "LXGW WenKai Screen", serif',
            weight: '400',
            cssUrl: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-web@1.522.0/style.css'
        },
        clearHanSerif: {
            label: '屏显臻宋',
            family: '"Clear Han Serif", serif',
            weight: '400',
            cssUrl: 'https://fontsapi.zeoseven.com/79/main/result.css'
        },
        jinshuSong: {
            label: '寒蝉锦书宋 Pro',
            family: '"寒蝉锦书宋Pro", serif',
            weight: '400',
            cssUrl: 'https://fontsapi.zeoseven.com/2246/main/result.css'
        },
        kingHwaOldSong: {
            label: '京华老宋体',
            family: '"KingHwaOldSong", serif',
            weight: '600',
            cssUrl: 'https://fontsapi.zeoseven.com/309/main/result.css'
        },
        cheeseFoamOolong: {
            label: '芝士奶盖乌龙',
            family: '"Cheese Foam Oolong Song", serif',
            weight: '400',
            cssUrl: 'https://fontsapi.zeoseven.com/2328/main/result.css'
        },
        chillKai: {
            label: '寒蝉正楷体',
            family: '"ChillKai", serif',
            weight: '600',
            cssUrl: 'https://fontsapi.zeoseven.com/5/main/result.css'
        },
        sarasaUiSC: {
            label: '更纱黑体',
            family: '"Sarasa UI SC", sans-serif',
            weight: '400',
            cssUrl: 'https://fontsapi.zeoseven.com/214/main/result.css'
        },
        dongGuan: {
            label: '上图东观',
            family: '"STDongGuanTi", serif',
            weight: '400',
            cssUrl: 'https://fontsapi.zeoseven.com/488/main/result.css'
        },
        custom: {
            label: '自定义',
            family: '',
            weight: '400'
        }
    };

    const DEFAULT_SETTINGS = {
        enabled: true,
        focusMode: true,
        fontPreset: 'wenkai',
        customFont: '',
        customFontBold: false,
        fontSize: 20,
        lineHeight: 1.8,
        letterSpacing: 0.02,
        paragraphSpacing: 0.8,
        maxWidth: 44,
        enableIndent: true,
        justifyText: true,
        cleanBreaks: true,
        spaceCjkEnglish: true,
        seamlessLoading: false,
        showPageTurnControls: false,
        hideSignatures: true,
        highContrast: true
    };

    const NUMERIC_RULES = {
        fontSize: [14, 30],
        lineHeight: [1.4, 2.4],
        letterSpacing: [-0.02, 0.12],
        paragraphSpacing: [0, 2],
        maxWidth: [30, 64]
    };

    const BOOLEAN_KEYS = new Set([
        'enabled',
        'focusMode',
        'customFontBold',
        'enableIndent',
        'justifyText',
        'cleanBreaks',
        'spaceCjkEnglish',
        'seamlessLoading',
        'showPageTurnControls',
        'hideSignatures',
        'highContrast'
    ]);

    const HAN_CHARACTER = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
    const ASCII_WORD_CHARACTER = /[A-Za-z0-9]/;
    const PUNCTUATION_BEFORE_ASCII_CHARACTER = /[、。，．！？；：…—～·“”（）【】《》「」『』〔〕〈〉〖〗〘〙〚〛｛｝［］",!?;:]/;
    const THIN_SPACE = '\u2009';
    const LEADING_INDENT_WHITESPACE = /^[\t\n\f\r \u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]+/;
    const ONLY_INDENT_WHITESPACE = /^[\t\n\f\r \u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]*$/;

    const TEXT_FLOW_BOUNDARY_TAGS = new Set([
        'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV',
        'DL', 'DT', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2',
        'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL',
        'P', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR',
        'UL'
    ]);

    const SPACING_EXCLUDED_TAGS = new Set([
        'AUDIO', 'BUTTON', 'CANVAS', 'CODE', 'EMBED', 'IFRAME', 'IMG',
        'INPUT', 'KBD', 'MATH', 'NOSCRIPT', 'OBJECT', 'OPTION', 'PRE', 'RUBY',
        'SAMP', 'SCRIPT', 'SELECT', 'STYLE', 'SVG', 'TEMPLATE', 'TEXTAREA',
        'VIDEO', 'WBR'
    ]);

    const BLOCK_TAGS = new Set([
        'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET',
        'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'HEADER', 'HR', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE',
        'UL'
    ]);

    const originalTextByNode = new WeakMap();
    const removedIndentPrefixByNode = new WeakMap();
    const loadedFontUrls = new Set();

    let settings = { ...DEFAULT_SETTINGS };
    let pageStyleElement = null;
    let observer = null;
    let observerTimer = null;
    let ui = null;
    let ownerId = '';
    let threadId = '';
    let pageTurnTimer = null;
    let seamlessRequest = null;
    let seamlessAppendInProgress = false;
    let seamlessObserver = null;
    let seamlessScrollFallbackBound = false;
    let seamlessNextPageUrl = null;
    let seamlessReachedEnd = false;
    let pageKind = '';
    let forumEnhancementGeneration = 0;
    let forumMovedNodes = [];
    const seamlessLoadedPages = new Set();

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function sanitizeFontFamily(value) {
        return String(value || '')
            .replace(/[;{}<>\\\r\n]/g, '')
            .trim()
            .slice(0, 200);
    }

    function normalizeSettings(stored) {
        const source = stored && typeof stored === 'object' ? stored : {};
        const normalized = { ...DEFAULT_SETTINGS };

        BOOLEAN_KEYS.forEach(key => {
            if (typeof source[key] === 'boolean') {
                normalized[key] = source[key];
            }
        });

        Object.entries(NUMERIC_RULES).forEach(([key, range]) => {
            const candidate = Number(source[key]);
            if (Number.isFinite(candidate)) {
                normalized[key] = clamp(candidate, range[0], range[1]);
            }
        });

        if (Object.prototype.hasOwnProperty.call(FONT_PRESETS, source.fontPreset)) {
            normalized.fontPreset = source.fontPreset;
        }

        normalized.customFont = sanitizeFontFamily(source.customFont);
        return normalized;
    }

    function readStoredSettings() {
        try {
            if (typeof GM_getValue === 'function') {
                const value = GM_getValue(STORAGE_KEY, null);
                if (value && typeof value === 'object') {
                    return value;
                }
            }
        } catch (error) {
            console.warn('[Discuz Reader] GM storage is unavailable.', error);
        }

        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch (error) {
            return null;
        }
    }

    function writeStoredSettings(value) {
        let gmSaved = false;

        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(STORAGE_KEY, value);
                gmSaved = true;
            }
        } catch (error) {
            console.warn('[Discuz Reader] Could not save to GM storage.', error);
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch (error) {
            if (!gmSaved) {
                console.warn('[Discuz Reader] Settings could not be saved.', error);
            }
        }
    }

    function addPageStyle(css) {
        if (typeof GM_addStyle === 'function') {
            try {
                return GM_addStyle(css);
            } catch (error) {
                console.warn('[Discuz Reader] GM_addStyle failed; using a style element.', error);
            }
        }

        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        return style;
    }

    function isDiscuzThreadPage() {
        const postList = document.querySelector('#postlist, .postlist, .vt');
        const subject = document.querySelector('#thread_subject, .postlist > h2');
        const message = document.querySelector(
            '[id^="postmessage_"], .postlist > [id^="pid"] .message'
        );
        return Boolean(postList && subject && message);
    }

    function isForumIndexRoute(urlValue, expectedOrigin = '') {
        if (!urlValue) {
            return false;
        }

        try {
            const url = new URL(
                urlValue,
                expectedOrigin ? `${expectedOrigin}/` : 'https://discuz.invalid/'
            );
            if (expectedOrigin && url.origin !== expectedOrigin) {
                return false;
            }
            if (!/(?:^|\/)forum\.php$/i.test(url.pathname)) {
                return false;
            }
            const mode = url.searchParams.get('mod');
            return (!mode || mode === 'index') &&
                !url.searchParams.has('fid') &&
                !url.searchParams.has('tid');
        } catch (error) {
            return false;
        }
    }

    function isMobileForumIndexUrl(urlValue, expectedOrigin = '') {
        if (!isForumIndexRoute(urlValue, expectedOrigin)) {
            return false;
        }
        try {
            const url = new URL(
                urlValue,
                expectedOrigin ? `${expectedOrigin}/` : 'https://discuz.invalid/'
            );
            return ['1', 'yes'].includes(url.searchParams.get('mobile') || '');
        } catch (error) {
            return false;
        }
    }

    function isMobileForumIndexDom(root = document) {
        return Boolean(root.querySelector('.fl > .bm > .bm_h, .fl .bm .bm_h'));
    }

    function resolvePageKindFromSignals(
        hasThreadDom,
        hasForumUrl,
        hasForumListDom,
        hasForumIndexUrl = false,
        hasForumIndexDom = false
    ) {
        if (hasThreadDom) {
            return 'thread';
        }
        if (hasForumUrl && hasForumListDom) {
            return 'forum';
        }
        return hasForumIndexUrl && hasForumIndexDom ? 'forum-index' : '';
    }

    function getForumListingTemplate(root = document) {
        if (root.querySelector('.threadlist')) {
            return 'touch';
        }
        if (root.querySelector('#threadlist')) {
            return 'desktop';
        }
        return root.querySelector('.tl') ? 'mobile' : '';
    }

    function getUidFromHref(href, baseUrl) {
        if (!href) {
            return '';
        }

        try {
            const url = new URL(href, baseUrl || 'https://discuz.invalid/');
            const uid = url.searchParams.get('uid');
            return /^\d+$/.test(uid || '') ? uid : '';
        } catch (error) {
            const match = String(href).match(/[?&]uid=(\d+)/);
            return match ? match[1] : '';
        }
    }

    function getAuthorIdFromHref(href, baseUrl) {
        if (!href) {
            return '';
        }

        try {
            const url = new URL(href, baseUrl || 'https://discuz.invalid/');
            const authorId = url.searchParams.get('authorid');
            return /^\d+$/.test(authorId || '') ? authorId : '';
        } catch (error) {
            const match = String(href).match(/[?&]authorid=(\d+)/);
            return match ? match[1] : '';
        }
    }

    function getThreadIdFromUrl(urlValue) {
        try {
            const url = new URL(urlValue, 'https://discuz.invalid/');
            const queryId = url.searchParams.get('tid');
            if (/^\d+$/.test(queryId || '')) {
                return queryId;
            }

            const pathMatch = url.pathname.match(/(?:^|\/)thread-(\d+)-\d+-\d+\.html$/i);
            return pathMatch ? pathMatch[1] : '';
        } catch (error) {
            return '';
        }
    }

    function getCurrentPageNumber(urlValue) {
        try {
            const url = new URL(urlValue, 'https://discuz.invalid/');
            const queryPage = Number(url.searchParams.get('page'));
            if (Number.isInteger(queryPage) && queryPage > 0) {
                return queryPage;
            }

            const pathMatch = url.pathname.match(/(?:^|\/)thread-\d+-(\d+)-\d+\.html$/i);
            return pathMatch ? Number(pathMatch[1]) : 1;
        } catch (error) {
            return 1;
        }
    }

    function getForumListingInfo(urlValue, expectedOrigin = '') {
        if (!urlValue) {
            return null;
        }

        let url;
        try {
            url = new URL(
                urlValue,
                expectedOrigin ? `${expectedOrigin}/` : 'https://discuz.invalid/'
            );
        } catch (error) {
            return null;
        }

        if (expectedOrigin && url.origin !== expectedOrigin) {
            return null;
        }

        const queryFid = url.searchParams.get('fid');
        const queryMode = url.searchParams.get('mod');
        const pathMatch = url.pathname.match(/(?:^|\/)forum-(\d+)-(\d+)\.html$/i);
        const fid = /^\d+$/.test(queryFid || '') && queryMode === 'forumdisplay'
            ? queryFid
            : (pathMatch ? pathMatch[1] : '');
        if (!fid) {
            return null;
        }

        const queryPage = Number(url.searchParams.get('page'));
        const page = Number.isInteger(queryPage) && queryPage > 0
            ? queryPage
            : (pathMatch ? Number(pathMatch[2]) : 1);
        url.hash = '';
        return { url, fid, page };
    }

    function parseThreadExtraParams(threadUrl) {
        let url;
        try {
            url = new URL(threadUrl, 'https://discuz.invalid/');
        } catch (error) {
            return new URLSearchParams();
        }

        let extra = url.searchParams.get('extra') || '';
        if (extra.includes('%')) {
            try {
                extra = decodeURIComponent(extra);
            } catch (error) {
                // URLSearchParams has already decoded the common case.
            }
        }

        return new URLSearchParams(extra.replace(/&amp;/gi, '&'));
    }

    function applyThreadContextToForumUrl(listingHref, threadHref) {
        const listing = getForumListingInfo(listingHref);
        if (!listing) {
            return null;
        }

        let threadUrl;
        try {
            threadUrl = new URL(threadHref, listing.url);
        } catch (error) {
            return listing.url;
        }

        const extra = parseThreadExtraParams(threadUrl.href);
        const permittedKey = key => [
            'page', 'filter', 'typeid', 'sortid', 'orderby', 'dateline'
        ].includes(key) || /^searchoption\[\d+\]$/.test(key);

        extra.forEach((value, key) => {
            if (permittedKey(key) && value) {
                const seoMatch = listing.url.pathname.match(/forum-(\d+)-(\d+)\.html$/i);
                if (key === 'page' && /^\d+$/.test(value) && seoMatch) {
                    listing.url.pathname = listing.url.pathname.replace(
                        /forum-(\d+)-(\d+)\.html$/i,
                        `forum-${seoMatch[1]}-${value}.html`
                    );
                    listing.url.searchParams.delete('page');
                } else {
                    listing.url.searchParams.set(key, value);
                }
            }
        });

        ['filter', 'typeid', 'sortid'].forEach(key => {
            const value = threadUrl.searchParams.get(key);
            if (value) {
                listing.url.searchParams.set(key, value);
            }
        });

        const mobileMode = threadUrl.searchParams.get('mobile');
        if (mobileMode && !listing.url.searchParams.has('mobile')) {
            listing.url.searchParams.set('mobile', mobileMode);
        }
        return listing.url;
    }

    function getThreadId() {
        const current = getThreadIdFromUrl(location.href);
        if (current) {
            return current;
        }

        const threadLink = document.querySelector(
            'a[href*="mod=viewthread"][href*="tid="], a[href*="action=reply"][href*="tid="]'
        );
        return threadLink ? getThreadIdFromUrl(threadLink.href) : '';
    }

    function getPostContainers() {
        const messages = Array.from(document.querySelectorAll(
            '[id^="postmessage_"], .postlist > [id^="pid"] .message'
        ));
        const unique = new Set();
        const posts = [];

        messages.forEach(message => {
            const post = message.closest(
                'table[id^="pid"], article[id^="pid"], li[id^="pid"], div[id^="pid"]'
            ) || message.closest('.pbody');
            if (post && !unique.has(post)) {
                unique.add(post);
                posts.push(post);
            }
        });

        return posts;
    }

    function getMessageRoot(post) {
        if (!post) {
            return null;
        }
        if (post.matches('[id^="postmessage_"]')) {
            return post;
        }
        return post.querySelector('[id^="postmessage_"], .message');
    }

    function getPostMetadataRoot(post) {
        const message = getMessageRoot(post);
        const pidMatch = message && message.id.match(/^postmessage_(\d+)$/);
        if (!pidMatch) {
            return post;
        }
        return document.getElementById(`pid${pidMatch[1]}`) || post;
    }

    function getPostAuthorAnchor(post) {
        if (!post) {
            return null;
        }

        const localAnchor = post.querySelector(
            '.pls .authi a[href*="uid="], ' +
            '.pls .avatar a[href*="uid="], ' +
            '.plc > .pi .authi a[href*="uid="], ' +
            'a[href*="home.php?mod=space"][href*="uid="]'
        );
        if (localAnchor) {
            return localAnchor;
        }

        const metadataRoot = getPostMetadataRoot(post);
        return metadataRoot === post ? null : metadataRoot.querySelector('a[href*="uid="]');
    }

    function getPostAuthorId(post) {
        if (!post) {
            return '';
        }

        if (/^\d+$/.test(post.dataset.dzrAuthorId || '')) {
            return post.dataset.dzrAuthorId;
        }

        const anchor = getPostAuthorAnchor(post);
        const uid = anchor ? getUidFromHref(anchor.href, location.href) : '';
        if (uid) {
            post.dataset.dzrAuthorId = uid;
        }
        return uid;
    }

    function readCachedOwnerId(id) {
        if (!id) {
            return '';
        }

        try {
            const value = sessionStorage.getItem(`${OWNER_CACHE_PREFIX}${id}`) ||
                localStorage.getItem(`${OWNER_CACHE_PREFIX}${id}`) || '';
            return /^\d+$/.test(value) ? value : '';
        } catch (error) {
            return '';
        }
    }

    function cacheOwnerId(id, uid) {
        if (!id || !/^\d+$/.test(uid || '')) {
            return;
        }

        try {
            sessionStorage.setItem(`${OWNER_CACHE_PREFIX}${id}`, uid);
            localStorage.setItem(`${OWNER_CACHE_PREFIX}${id}`, uid);
        } catch (error) {
            // Storage can be disabled; owner detection still works on this page.
        }
    }

    function resolveOwnerCandidate(candidates) {
        if (candidates.nativeFilterUid) {
            return candidates.nativeFilterUid;
        }
        if (candidates.headingUid) {
            return candidates.headingUid;
        }
        if (candidates.lzUid) {
            return candidates.lzUid;
        }
        if (candidates.cachedUid) {
            return candidates.cachedUid;
        }
        if (candidates.isFirstPage && !candidates.hasAuthorFilter) {
            return candidates.firstPostUid || '';
        }
        return '';
    }

    function detectOwnerId() {
        const posts = getPostContainers();
        const headingAnchor = document.querySelector('#tath a[href*="uid="]');
        const nativeFilterLink = document.querySelector(
            '.postlist > h2 a[href*="authorid="]'
        );
        const lzIcon = document.querySelector(
            '#postlist img[id^="authicon"][src*="ico_lz"], ' +
            '#postlist img[id^="authicon"][alt*="楼主"]'
        );
        const lzPost = lzIcon ? lzIcon.closest(
            'table[id^="pid"], article[id^="pid"], li[id^="pid"], div[id^="pid"]'
        ) : null;
        const currentUrl = new URL(location.href);
        const isTouchTemplate = Boolean(document.querySelector('.postlist')) &&
            !document.getElementById('postlist');
        const isStandardMobileTemplate = Boolean(document.querySelector('.vt')) &&
            !document.getElementById('postlist');

        const candidate = resolveOwnerCandidate({
            nativeFilterUid: nativeFilterLink
                ? getAuthorIdFromHref(nativeFilterLink.href, location.href)
                : ((isTouchTemplate || isStandardMobileTemplate)
                    ? getAuthorIdFromHref(location.href, location.href)
                    : ''),
            headingUid: headingAnchor ? getUidFromHref(headingAnchor.href, location.href) : '',
            lzUid: getPostAuthorId(lzPost),
            cachedUid: readCachedOwnerId(threadId),
            firstPostUid: posts.length ? getPostAuthorId(posts[0]) : '',
            isFirstPage: getCurrentPageNumber(location.href) === 1,
            hasAuthorFilter: Boolean(currentUrl.searchParams.get('authorid'))
        });

        if (candidate) {
            cacheOwnerId(threadId, candidate);
        }
        return candidate;
    }

    function buildAuthorFilterUrl(currentHref, id, uid, active, targetPid = '') {
        const current = new URL(currentHref);

        if (/^\d+$/.test(String(targetPid || ''))) {
            const redirectUrl = new URL('forum.php', current);
            redirectUrl.search = '';
            redirectUrl.hash = '';
            redirectUrl.searchParams.set('mod', 'redirect');
            redirectUrl.searchParams.set('goto', 'findpost');
            redirectUrl.searchParams.set('ptid', id);
            redirectUrl.searchParams.set('pid', targetPid);

            if (!active) {
                redirectUrl.searchParams.set('authorid', uid);
            }
            ['ordertype', 'mobile'].forEach(key => {
                const value = current.searchParams.get(key);
                if (value) {
                    redirectUrl.searchParams.set(key, value);
                }
            });
            return redirectUrl.href;
        }

        if (active) {
            current.searchParams.delete('authorid');
            current.searchParams.delete('page');
            return current.href;
        }

        const forumUrl = new URL('forum.php', current);
        forumUrl.search = '';
        forumUrl.hash = '';
        forumUrl.searchParams.set('mod', 'viewthread');
        forumUrl.searchParams.set('tid', id);
        forumUrl.searchParams.set('authorid', uid);
        const mobileMode = current.searchParams.get('mobile');
        if (mobileMode) {
            forumUrl.searchParams.set('mobile', mobileMode);
        }
        return forumUrl.href;
    }

    function isOwnerFilterActive() {
        if (!ownerId) {
            return false;
        }
        return new URL(location.href).searchParams.get('authorid') === ownerId;
    }

    function getPostId(post) {
        if (!post) {
            return '';
        }

        const message = getMessageRoot(post);
        const messageMatch = String(message?.id || '').match(/^postmessage_(\d+)$/);
        if (messageMatch) {
            return messageMatch[1];
        }

        const postMatch = String(post.id || '').match(/^pid(\d+)$/);
        return postMatch ? postMatch[1] : '';
    }

    function findNearestUnreadPost(targetAuthorId = '') {
        const posts = getPostContainers().filter(post => getPostId(post));
        if (!posts.length) {
            return null;
        }

        // A floor remains unread until its bottom edge has passed the viewport.
        // This intentionally repeats a partially read floor after switching modes.
        const unreadPosts = posts.filter(post => post.getBoundingClientRect().bottom > 1);
        const candidates = unreadPosts.length ? unreadPosts : [posts[posts.length - 1]];
        if (targetAuthorId) {
            const targetAuthorPost = candidates.find(
                post => getPostAuthorId(post) === targetAuthorId
            );
            if (targetAuthorPost) {
                return targetAuthorPost;
            }
        }
        return candidates[0];
    }

    function rememberOwnerFilterPosition(pid, targetAuthorId) {
        if (!threadId || !/^\d+$/.test(pid || '')) {
            return;
        }

        try {
            sessionStorage.setItem(`${OWNER_POSITION_PREFIX}${threadId}`, JSON.stringify({
                pid,
                targetAuthorId: targetAuthorId || '',
                savedAt: Date.now()
            }));
        } catch (error) {
            // Exact post anchors still work when session storage is unavailable.
        }
    }

    function prepareOwnerFilterNavigation() {
        const active = isOwnerFilterActive();
        const targetAuthorId = active ? '' : ownerId;
        const targetPost = findNearestUnreadPost(targetAuthorId);
        const targetPid = getPostId(targetPost);

        if (targetPid) {
            rememberOwnerFilterPosition(targetPid, targetAuthorId);
        }
        ui.ownerFilter.href = buildAuthorFilterUrl(
            location.href,
            threadId,
            ownerId,
            active,
            targetPid
        );
    }

    function restoreOwnerFilterPosition() {
        if (!threadId) {
            return;
        }

        let saved;
        try {
            const key = `${OWNER_POSITION_PREFIX}${threadId}`;
            saved = JSON.parse(sessionStorage.getItem(key) || 'null');
            sessionStorage.removeItem(key);
        } catch (error) {
            return;
        }

        const currentAuthorId = new URL(location.href).searchParams.get('authorid') || '';
        if (!saved || !/^\d+$/.test(saved.pid || '') ||
            saved.targetAuthorId !== currentAuthorId ||
            Date.now() - Number(saved.savedAt) > 30000) {
            return;
        }

        const posts = getPostContainers();
        const exactPost = posts.find(post => getPostId(post) === saved.pid);
        const targetNumber = Number(saved.pid);
        const postNumbers = posts.map(post => Number(getPostId(post))).filter(Number.isFinite);
        const descending = postNumbers.length > 1 &&
            postNumbers[0] > postNumbers[postNumbers.length - 1];
        const nearbyPost = exactPost || posts.find(post => descending
            ? Number(getPostId(post)) <= targetNumber
            : Number(getPostId(post)) >= targetNumber
        ) || posts[posts.length - 1];
        if (!nearbyPost) {
            return;
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                nearbyPost.scrollIntoView({ block: 'start' });
            });
        });
    }

    function getFontConfiguration(value) {
        const preset = FONT_PRESETS[value.fontPreset] || FONT_PRESETS.wenkai;
        if (value.fontPreset === 'custom') {
            return {
                family: value.customFont || FONT_PRESETS.system.family,
                weight: value.customFontBold ? '600' : '400',
                cssUrl: ''
            };
        }
        return preset;
    }

    function ensureFontLoaded(value) {
        const font = getFontConfiguration(value);
        if (!font.cssUrl || loadedFontUrls.has(font.cssUrl)) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = font.cssUrl;
        link.dataset.dzrFont = value.fontPreset;
        (document.head || document.documentElement).appendChild(link);
        loadedFontUrls.add(font.cssUrl);
    }

    function renderPageStyles() {
        if (!pageStyleElement) {
            pageStyleElement = addPageStyle('');
        }

        if (!pageStyleElement || !('textContent' in pageStyleElement)) {
            pageStyleElement = document.createElement('style');
            pageStyleElement.id = `${SCRIPT_ID}-page-style`;
            (document.head || document.documentElement).appendChild(pageStyleElement);
        } else {
            pageStyleElement.id = `${SCRIPT_ID}-page-style`;
        }

        const font = getFontConfiguration(settings);
        const fontFamily = sanitizeFontFamily(font.family) || FONT_PRESETS.system.family;

        pageStyleElement.textContent = `
            html.${ROOT_ENABLED_CLASS} {
                --dzr-font-family: ${fontFamily};
                --dzr-font-weight: ${font.weight};
                --dzr-font-size: ${settings.fontSize}px;
                --dzr-line-height: ${settings.lineHeight};
                --dzr-letter-spacing: ${settings.letterSpacing}em;
                --dzr-paragraph-gap: ${settings.paragraphSpacing}em;
                --dzr-reading-width: ${settings.maxWidth}em;
                --dzr-indent: ${settings.enableIndent ? '2em' : '0'};
                --dzr-align: ${settings.justifyText ? 'justify' : 'start'};
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message,
            html.${ROOT_ENABLED_CLASS} .dzr-message
                *:not(code):not(pre):not(kbd):not(samp):not(input):not(button):not(textarea):not(select) {
                font-family: var(--dzr-font-family) !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message {
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: var(--dzr-reading-width) !important;
                margin-inline: auto !important;
                color: #171717;
                font-size: var(--dzr-font-size) !important;
                font-weight: var(--dzr-font-weight) !important;
                line-height: var(--dzr-line-height) !important;
                letter-spacing: var(--dzr-letter-spacing) !important;
                overflow-wrap: anywhere;
                word-break: normal;
                text-align: var(--dzr-align);
            }

            html.${ROOT_ENABLED_CLASS} #postlist,
            html.${ROOT_ENABLED_CLASS} .postlist,
            html.${ROOT_ENABLED_CLASS} .vt {
                padding-bottom: 72px;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message p {
                margin-block: 0 var(--dzr-paragraph-gap) !important;
                text-indent: var(--dzr-indent) !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message p:last-child {
                margin-bottom: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message.${ROOT_PARAGRAPH_CLASS} {
                text-indent: var(--dzr-indent) !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message.${WRAPPED_ROOT_CLASS} {
                text-indent: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message .${LINE_CLASS} {
                display: block !important;
                min-height: 1em;
                margin-bottom: var(--dzr-paragraph-gap) !important;
                text-indent: var(--dzr-indent) !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message .${LINE_CLASS}:last-child {
                margin-bottom: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message img,
            html.${ROOT_ENABLED_CLASS} .dzr-message video,
            html.${ROOT_ENABLED_CLASS} .dzr-message iframe {
                max-width: 100% !important;
                height: auto;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message blockquote {
                box-sizing: border-box;
                margin: 1em 0 !important;
                padding: .7em 1em !important;
                border: 0 !important;
                border-inline-start: 3px solid #777 !important;
                background: #f3f3f3 !important;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-message pre,
            html.${ROOT_ENABLED_CLASS} .dzr-message code {
                font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
                text-align: start;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            html.${ROOT_PAGE_TURN_CLASS} body {
                box-sizing: border-box;
                padding-left: calc(32px + env(safe-area-inset-left)) !important;
                padding-right: calc(32px + env(safe-area-inset-right)) !important;
            }

            html.${ROOT_INSTANT_TURN_CLASS},
            html.${ROOT_INSTANT_TURN_CLASS} body {
                scroll-behavior: auto !important;
            }

            html.${ROOT_ENABLED_CLASS} .${SEAMLESS_BOUNDARY_CLASS} {
                display: flex;
                max-width: var(--dzr-reading-width);
                align-items: center;
                gap: 10px;
                margin: 18px auto !important;
                color: #333;
                font: 700 13px/1.2 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
            }

            html.${ROOT_ENABLED_CLASS} .${SEAMLESS_BOUNDARY_CLASS}::before,
            html.${ROOT_ENABLED_CLASS} .${SEAMLESS_BOUNDARY_CLASS}::after {
                content: "";
                flex: 1 1 auto;
                border-top: 1px solid #777;
            }

            html.${ROOT_ENABLED_CLASS} .${SEAMLESS_BOUNDARY_CLASS} a {
                color: inherit !important;
                white-space: nowrap;
                text-decoration: none !important;
            }

            html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID} {
                box-sizing: border-box;
                max-width: var(--dzr-reading-width);
                min-height: 1px;
                margin: 12px auto !important;
                padding: 0;
                color: #111;
                background: #fff;
                font: 700 13px/1.4 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                text-align: center;
            }

            html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID}[data-state="loading"],
            html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID}[data-state="error"],
            html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID}[data-state="end"] {
                min-height: 44px;
                padding: 12px;
                border: 1px solid #777;
            }

            html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID} a {
                color: #111 !important;
                text-decoration: underline !important;
                text-underline-offset: .16em;
            }

            html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} {
                display: flex;
                max-width: var(--dzr-reading-width);
                justify-content: center;
                margin: 24px auto 12px !important;
                padding: 0 8px;
            }

            html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} .dzr-return-link {
                display: inline-flex;
                min-height: 48px;
                max-width: 100%;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px 16px;
                border: 2px solid #111;
                border-radius: 8px;
                color: #111 !important;
                background: #fff !important;
                box-shadow: 0 2px 0 #111;
                font: 700 14px/1.3 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                text-align: center;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} .dzr-return-link:focus-visible {
                outline: 3px solid #1769e0;
                outline-offset: 3px;
            }

            html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} svg {
                flex: 0 0 auto;
                width: 18px;
                height: 18px;
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
            }

            html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} span {
                min-width: 0;
                overflow-wrap: anywhere;
            }

            html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} small {
                flex: 0 0 auto;
                padding-inline-start: 8px;
                border-inline-start: 1px solid #777;
                color: #444;
                font-size: 12px;
                white-space: nowrap;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-byline {
                box-sizing: border-box;
                display: none;
                width: min(100%, var(--dzr-reading-width));
                margin: 0 auto 1rem;
                padding-bottom: .65rem;
                border-bottom: 1px solid #b7b7b7;
                color: #505050;
                font: 14px/1.5 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                letter-spacing: 0;
                text-align: start;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-byline a {
                color: inherit;
                font-weight: 700;
                text-decoration: none;
            }

            html.${ROOT_ENABLED_CLASS} .dzr-owner-badge {
                display: inline-block;
                margin-inline-start: .5em;
                padding: .05em .45em;
                border: 1px solid currentColor;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 700;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] > tbody > tr > td.pls,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] > tr > td.pls {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] {
                box-sizing: border-box;
                width: 100% !important;
                margin: 0 0 1.2rem !important;
                border: 1px solid #aaa !important;
                table-layout: auto !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] td.plc {
                box-sizing: border-box;
                width: 100% !important;
                padding-inline: clamp(12px, 3vw, 36px) !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] td.plc > .pi,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] .po,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] tr.ad {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] .pct {
                padding-block: clamp(16px, 3vw, 32px) !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .dzr-byline {
                display: block;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .postlist > [id^="pid"] {
                box-sizing: border-box;
                margin: 0 0 1rem !important;
                padding: clamp(14px, 3vw, 26px) !important;
                border: 1px solid #aaa !important;
                background: #fff;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .postlist > [id^="pid"] > .avatar,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .postlist > [id^="pid"] > .display > .authi {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .postlist > [id^="pid"] > .display {
                margin: 0 !important;
                padding: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .vt > .bm > .bm_c {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .vt .pbody {
                box-sizing: border-box;
                margin: 0 0 1rem !important;
                padding: clamp(14px, 3vw, 26px) !important;
                border: 1px solid #aaa !important;
                color: #000;
                background: #fff;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .vt .pbody > h2 {
                max-width: var(--dzr-reading-width);
                margin-inline: auto;
            }

            html.${ROOT_ENABLED_CLASS} #postlist .sign,
            html.${ROOT_ENABLED_CLASS} .postlist .sign {
                ${settings.hideSignatures ? 'display: none !important;' : ''}
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} body,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #wp,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .wp,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #ct,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #postlist,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .postlist,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .vt,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .vt > .bm,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .vt .pbody,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .vt .mes,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #postlist table[id^="pid"],
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #postlist table[id^="pid"] td,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .postlist > [id^="pid"],
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #postlist .pcb,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #postlist .pct,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .dzr-message {
                color: #000 !important;
                background-color: #fff !important;
                background-image: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} #postlist a,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .postlist a,
            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .vt a {
                color: #000 !important;
                text-decoration: underline;
                text-decoration-thickness: 1px;
                text-underline-offset: .16em;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_CONTRAST_CLASS} .dzr-message blockquote {
                color: #000 !important;
                background: #fff !important;
                border-inline-start-color: #000 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} body {
                box-sizing: border-box;
                min-width: 0 !important;
                padding-bottom: 72px;
                overflow-x: hidden;
                color: #111;
                background: #fff;
                font-family: var(--dzr-font-family) !important;
                font-size: max(16px, calc(var(--dzr-font-size) - 2px));
                line-height: 1.5;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-group,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} body > .box,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft {
                box-sizing: border-box;
                width: min(100%, 64rem) !important;
                margin-inline: auto !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd {
                min-height: 52px;
                padding: 0 !important;
                border: 0 !important;
                border-bottom: 3px solid #111 !important;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd > a {
                box-sizing: border-box;
                display: flex !important;
                min-height: 52px;
                align-items: center;
                padding: 8px 12px !important;
                color: #111 !important;
                font-weight: 800;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd img {
                max-width: 100%;
                max-height: 36px;
                object-fit: contain;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp {
                padding: 8px !important;
                color: #111;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp > .pd2 {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                padding: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp > .pd2 > .pipe,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft p:last-child > .pipe {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp > .pd2 > a,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft p:last-child > a {
                box-sizing: border-box;
                display: inline-flex !important;
                min-height: 44px;
                align-items: center;
                justify-content: center;
                padding: 8px 11px !important;
                border: 1px solid #777 !important;
                color: #111 !important;
                background: #fff !important;
                font: 700 15px/1.25 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-group {
                margin-block: 12px !important;
                padding-inline: 8px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-group > .bm {
                margin: 0 !important;
                overflow: hidden;
                border: 2px solid #111 !important;
                border-radius: 0 !important;
                color: #111;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                .dzr-forum-index-group > .bm > .bm_h {
                box-sizing: border-box;
                display: flex !important;
                width: 100%;
                min-height: 48px;
                height: auto !important;
                align-items: center;
                margin: 0 !important;
                padding: 10px 12px !important;
                overflow: visible !important;
                border: 0 !important;
                border-bottom: 2px solid #111 !important;
                color: #fff !important;
                background: #111 !important;
                font: 800 16px/1.35 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                letter-spacing: .04em;
                white-space: normal !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                .dzr-forum-index-group > .bm > .bm_h > a {
                box-sizing: border-box;
                display: flex !important;
                min-height: 48px;
                flex: 1;
                align-items: center;
                margin: -10px -12px !important;
                padding: 10px 12px !important;
                color: #fff !important;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                .dzr-forum-index-group > .bm > .bm_c {
                box-sizing: border-box;
                display: flex !important;
                width: 100%;
                min-height: 56px;
                align-items: center;
                margin: 0 !important;
                padding: 0 12px !important;
                border: 0 !important;
                border-bottom: 1px solid #999 !important;
                color: #111 !important;
                background: #fff !important;
                font-size: max(16px, calc(var(--dzr-font-size) - 2px));
                line-height: 1.4;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                .dzr-forum-index-group > .bm > .bm_c:last-child {
                border-bottom: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-link {
                box-sizing: border-box;
                display: flex !important;
                min-width: 0;
                min-height: 56px;
                flex: 1;
                align-items: center;
                padding-block: 10px !important;
                color: #111 !important;
                font-weight: 700;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                .dzr-forum-index-group .bm_c > a:last-of-type:not(:first-of-type) {
                box-sizing: border-box;
                display: inline-flex !important;
                min-width: 44px;
                min-height: 44px;
                align-self: center;
                align-items: center;
                justify-content: center;
                margin-inline-start: 8px;
                border-inline-start: 1px solid #999;
                color: #111 !important;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} body > .box {
                margin-block: 12px !important;
                padding: 12px !important;
                border-block: 1px solid #999 !important;
                color: #333 !important;
                background: #fff !important;
                font-size: 14px;
                line-height: 1.5;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft {
                margin-block: 16px 0 !important;
                padding: 12px 8px !important;
                border-top: 2px solid #111;
                color: #333;
                background: #fff;
                line-height: 1.5;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft p:last-child {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-group a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft a:focus-visible {
                position: relative;
                z-index: 1;
                outline: 3px solid #1769e0 !important;
                outline-offset: -3px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} body,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} .hd,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} .wp,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} .bm,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} .bm_c,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} .box,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} .ft {
                color: #000 !important;
                background-color: #fff !important;
                background-image: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} body a {
                color: #000 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS}
                .dzr-forum-index-group > .bm > .bm_h,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS}
                .dzr-forum-index-group > .bm > .bm_h > a {
                color: #fff !important;
                background: #000 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}.${ROOT_CONTRAST_CLASS} img {
                filter: grayscale(1) contrast(1.25);
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} body {
                padding-bottom: 72px;
                color: #111;
                font-family: var(--dzr-font-family) !important;
                line-height: 1.55;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #${FORUM_TOP_ID} {
                box-sizing: border-box;
                display: grid;
                width: min(100%, 64rem);
                gap: 12px;
                margin: 0 auto 14px !important;
                padding: 0 8px;
                color: #111;
                font-family: var(--dzr-font-family) !important;
                text-align: start;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #${FORUM_TOP_ID}:empty {
                display: none;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} {
                min-width: 0;
                margin: 0 !important;
                padding: 0 !important;
                border: 2px solid #111 !important;
                border-radius: 0 !important;
                color: #111;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} > h2 {
                margin: 0 !important;
                padding: 8px 12px !important;
                border: 0 !important;
                color: #fff !important;
                background: #111 !important;
                font: 800 15px/1.35 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                letter-spacing: .04em;
                text-align: start;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .bm_h {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .bm,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .bm_c,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .subname_list {
                position: static !important;
                inset: auto !important;
                display: block !important;
                float: none !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .header .category .display img {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb tbody,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb tr {
                display: block !important;
                width: 100% !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb td,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_g {
                box-sizing: border-box;
                display: block !important;
                width: 100% !important;
                min-height: 44px;
                padding: 8px 12px !important;
                border: 0 !important;
                border-bottom: 1px solid #aaa !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb td.fl_icn,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_icn_g,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb td.fl_i,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb td.fl_by {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} dl {
                margin: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .arrow_r,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .subname_list li {
                min-height: 44px;
                margin: 0 !important;
                padding: 0 !important;
                border-bottom: 1px solid #aaa !important;
                list-style: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .arrow_r:last-child,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .subname_list li:last-child,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .fl_tb tr:last-child td:last-child {
                border-bottom: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .block_a,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} .subname_list li > a {
                box-sizing: border-box;
                display: flex !important;
                min-height: 44px;
                align-items: center;
                padding: 9px 12px !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] > .ttp,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] > .tst {
                box-sizing: border-box;
                display: flex !important;
                width: 100% !important;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                margin: 0 !important;
                padding: 10px !important;
                border: 0 !important;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] > .ttp + .tst {
                border-top: 1px solid #aaa !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] li {
                display: block !important;
                margin: 0 !important;
                list-style: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] .pipe {
                display: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] a {
                box-sizing: border-box;
                display: inline-flex !important;
                min-height: 44px;
                align-items: center;
                padding: 8px 11px !important;
                border: 1px solid #777 !important;
                color: #111 !important;
                background: #fff !important;
                font-weight: 700;
                line-height: 1.25;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] .xw1,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] li.a > a {
                color: #fff !important;
                background: #111 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #${FORUM_TOP_ID} a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlist a:focus-visible {
                outline: 3px solid #1769e0 !important;
                outline-offset: -3px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist > ul,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist > ul > li {
                margin: 0 !important;
                padding: 0 !important;
                list-style: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist > ul > li,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .bm_c {
                box-sizing: border-box;
                min-height: 54px;
                border-bottom: 1px solid #aaa !important;
                color: #111 !important;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist > ul > li > a {
                display: block !important;
                min-height: 54px;
                padding: 10px 52px 10px 12px !important;
                color: #111 !important;
                font-size: max(16px, calc(var(--dzr-font-size) - 2px));
                line-height: 1.4;
                text-decoration: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist .by,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .xg1 {
                color: #444 !important;
                font-size: 13px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist .num {
                min-width: 32px;
                color: #111 !important;
                font-weight: 700;
                text-align: center;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl > .bm > .bm_h,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .bm_h {
                padding: 9px 12px !important;
                border-bottom: 2px solid #111 !important;
                color: #111 !important;
                background: #fff !important;
                font-weight: 800;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .bm_c {
                padding: 11px 12px !important;
                font-size: max(16px, calc(var(--dzr-font-size) - 2px));
                line-height: 1.45;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid {
                border-collapse: collapse !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                #threadlisttableid tbody[id^="normalthread_"] > tr {
                border-bottom: 1px solid #aaa !important;
                background: #fff !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid .xst {
                color: #111 !important;
                font-size: max(16px, calc(var(--dzr-font-size) - 2px));
                line-height: 1.4;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg {
                box-sizing: border-box;
                display: flex !important;
                float: none !important;
                clear: both;
                width: auto !important;
                min-height: 44px;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin: 12px 8px !important;
                padding: 0 !important;
                font: 700 15px/1 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > a,
            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > strong,
            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > .pgb > a {
                box-sizing: border-box;
                display: inline-flex !important;
                min-width: 44px;
                min-height: 44px;
                align-items: center;
                justify-content: center;
                margin: 0 !important;
                padding: 8px 11px !important;
                border: 1px solid #777 !important;
                color: #111 !important;
                background: #fff !important;
                text-align: center;
                text-decoration: none !important;
                touch-action: manipulation;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > .prev,
            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > .nxt,
            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > .pgb > a {
                min-width: 76px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > .pgb {
                display: contents !important;
                float: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > strong {
                border-color: #111 !important;
                color: #fff !important;
                background: #111 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > label {
                box-sizing: border-box;
                display: inline-flex !important;
                height: 44px;
                min-height: 44px;
                align-items: center;
                margin: 0 !important;
                padding: 0 !important;
                vertical-align: top;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > label > kbd {
                display: flex !important;
                height: 44px;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg input[name="custompage"],
            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg kbd input {
                box-sizing: border-box;
                width: 52px !important;
                min-width: 52px;
                height: 44px !important;
                min-height: 44px;
                margin: 0 !important;
                padding: 6px !important;
                border: 1px solid #777 !important;
                border-radius: 0 !important;
                color: #111 !important;
                background: #fff !important;
                font-size: 16px !important;
                line-height: 1 !important;
                text-align: center;
                vertical-align: top;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg > label > span {
                box-sizing: border-box;
                display: inline-flex !important;
                height: 44px;
                min-height: 44px;
                align-items: center;
                margin: 0 !important;
                padding-inline: 8px;
                border: 1px solid #777;
                border-inline-start: 0;
                color: #333;
                background: #fff;
                line-height: 1.25;
                white-space: nowrap;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg a:focus-visible,
            html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg input:focus-visible {
                position: relative;
                z-index: 1;
                outline: 3px solid #1769e0 !important;
                outline-offset: 2px;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} body,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} #ct,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} .wp,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} .bm,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} .box,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} .threadlist,
            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} .tl {
                color: #000 !important;
                background-color: #fff !important;
                background-image: none !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} body a {
                color: #000 !important;
            }

            html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}.${ROOT_CONTRAST_CLASS} img {
                filter: grayscale(1) contrast(1.25);
            }

            @media (max-width: 700px) {
                html.${ROOT_ENABLED_CLASS} #postlist,
                html.${ROOT_ENABLED_CLASS} .postlist,
                html.${ROOT_ENABLED_CLASS} .vt,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} body,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} body {
                    padding-bottom: 60px;
                }

                html.${ROOT_ENABLED_CLASS} .hd {
                    box-sizing: border-box;
                    min-height: 44px;
                    padding: 0 !important;
                }

                html.${ROOT_ENABLED_CLASS} .hd > a {
                    box-sizing: border-box;
                    display: flex !important;
                    min-height: 44px;
                    align-items: center;
                    padding: 6px 8px !important;
                    touch-action: manipulation;
                }

                html.${ROOT_ENABLED_CLASS} .nav {
                    box-sizing: border-box;
                    height: 44px !important;
                    padding: 6px 8px !important;
                    font-size: 17px !important;
                    line-height: 32px !important;
                }

                html.${ROOT_ENABLED_CLASS} .nav .name {
                    height: 32px !important;
                    line-height: 32px !important;
                }

                html.${ROOT_ENABLED_CLASS} .hdc {
                    margin-bottom: 6px !important;
                    padding: 6px 6px 0 !important;
                }

                html.${ROOT_ENABLED_CLASS} .user_fun li {
                    padding: 8px 4px !important;
                }

                html.${ROOT_ENABLED_CLASS} .dzr-message blockquote {
                    margin-block: .7em !important;
                    padding: .55em .75em !important;
                }

                html.${ROOT_ENABLED_CLASS} .dzr-byline {
                    margin-bottom: 8px;
                    padding-bottom: 6px;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] {
                    margin-bottom: 8px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} body,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #wp,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .wp,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #ct,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .boardnav,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .mn {
                    box-sizing: border-box !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    max-width: 100% !important;
                    margin-inline: 0 !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #ct[style] {
                    margin-left: 0 !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #sd_bdl,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #ct > .sd {
                    display: none !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid td.icn,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid td.num,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid td.by {
                    display: none !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid th.common,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid th.new,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #threadlisttableid th.lock {
                    box-sizing: border-box;
                    width: 100% !important;
                    padding: 8px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] td.plc {
                    padding-inline: 8px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] .pct {
                    padding-block: 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .postlist > [id^="pid"],
                html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} .vt .pbody {
                    margin-bottom: 8px !important;
                    padding: 10px !important;
                }

                html.${ROOT_ENABLED_CLASS} .dzr-message {
                    max-width: 100% !important;
                }

                html.${ROOT_ENABLED_CLASS} .${SEAMLESS_BOUNDARY_CLASS},
                html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID},
                html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} {
                    max-width: 100%;
                }

                html.${ROOT_ENABLED_CLASS} .${SEAMLESS_BOUNDARY_CLASS} {
                    gap: 8px;
                    margin-block: 12px !important;
                }

                html.${ROOT_ENABLED_CLASS} #${SEAMLESS_SENTINEL_ID} {
                    margin-block: 8px !important;
                }

                html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} {
                    margin-block: 14px 8px !important;
                    padding-inline: 4px;
                }

                html.${ROOT_ENABLED_CLASS} #${RETURN_FOOTER_ID} .dzr-return-link {
                    min-height: 44px;
                    gap: 6px;
                    padding: 8px 12px;
                    border-radius: 6px;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd {
                    min-height: 44px;
                    border-bottom-width: 2px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .hd > a {
                    min-height: 44px;
                    padding: 6px 8px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .wp {
                    padding: 4px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-group {
                    margin-block: 8px !important;
                    padding-inline: 4px;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                    .dzr-forum-index-group > .bm > .bm_h {
                    min-height: 44px;
                    padding: 8px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                    .dzr-forum-index-group > .bm > .bm_h > a {
                    min-height: 44px;
                    margin: -8px -10px !important;
                    padding: 8px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS}
                    .dzr-forum-index-group > .bm > .bm_c {
                    min-height: 48px;
                    padding-inline: 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .dzr-forum-index-link {
                    min-height: 48px;
                    padding-block: 8px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} body > .box {
                    margin-block: 8px !important;
                    padding: 8px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_INDEX_CLASS} .ft {
                    margin-top: 12px !important;
                    padding: 8px 4px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} #${FORUM_TOP_ID} {
                    gap: 8px;
                    margin-bottom: 8px !important;
                    padding-inline: 4px;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .${FORUM_SECTION_CLASS} > h2 {
                    padding: 7px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS} .fl_tb td,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS} .fl_g {
                    padding: 6px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS} .block_a,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS} .subname_list li > a {
                    padding: 6px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] > .ttp,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] > .tst {
                    gap: 8px;
                    padding: 8px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS}
                    .${FORUM_SECTION_CLASS}[data-dzr-forum-section="taxonomy"] a {
                    min-height: 44px;
                    padding: 6px 9px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist > ul > li,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .bm_c {
                    min-height: 48px;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .threadlist > ul > li > a {
                    min-height: 48px;
                    padding: 8px 44px 8px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl > .bm > .bm_h,
                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .bm_h {
                    padding: 7px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_FORUM_CLASS} .tl .bm_c {
                    padding: 8px 10px !important;
                }

                html.${ROOT_ENABLED_CLASS}.${ROOT_MOBILE_FORUM_CLASS} .pg {
                    margin: 8px 4px !important;
                }
            }

            @media print {
                #${SCRIPT_ID}-ui-host { display: none !important; }
                #${RETURN_FOOTER_ID} { display: none !important; }
                html.${ROOT_ENABLED_CLASS}.${ROOT_FOCUS_CLASS} #postlist table[id^="pid"] {
                    border-color: #bbb !important;
                    break-inside: avoid;
                }
            }
        `;
    }

    function applySettings() {
        const root = document.documentElement;
        root.classList.toggle(ROOT_ENABLED_CLASS, settings.enabled);
        root.classList.toggle(ROOT_FOCUS_CLASS, settings.enabled && settings.focusMode);
        root.classList.toggle(ROOT_CONTRAST_CLASS, settings.enabled && settings.highContrast);
        root.classList.toggle(ROOT_FORUM_CLASS, pageKind === 'forum');
        root.classList.toggle(ROOT_FORUM_INDEX_CLASS, pageKind === 'forum-index');
        root.classList.toggle(
            ROOT_MOBILE_FORUM_CLASS,
            pageKind === 'forum' && ['mobile', 'touch'].includes(getForumListingTemplate())
        );

        ensureFontLoaded(settings);
        renderPageStyles();
        if (pageKind === 'forum') {
            enhanceForumListing();
        } else if (pageKind === 'forum-index') {
            enhanceMobileForumIndex();
        } else {
            processPosts();
        }
        syncPageTurnControls();
        if (pageKind === 'thread') {
            configureSeamlessLoading();
            syncReturnFooter();
        }
    }

    function isBlankText(value) {
        return String(value || '')
            .replace(/[\s\u00A0\u1680\u180E\u2000-\u200F\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]/g, '')
            .trim() === '';
    }

    function getUpperTagName(element) {
        return String(element?.localName || element?.tagName || '').toUpperCase();
    }

    function isEmptyElement(element) {
        if (!element) {
            return true;
        }
        if (element.querySelector('img, iframe, video, audio, canvas, svg, object, embed, input, button')) {
            return false;
        }
        return isBlankText(element.textContent);
    }

    function clearForumListingEnhancement() {
        forumEnhancementGeneration += 1;
        forumMovedNodes.slice().reverse().forEach(({ node, marker }) => {
            if (marker?.isConnected) {
                marker.replaceWith(node);
            }
        });
        forumMovedNodes = [];
        document.getElementById(FORUM_TOP_ID)?.remove();
    }

    function createForumSection(top, kind, label) {
        let section = top.querySelector(`[data-dzr-forum-section="${kind}"]`);
        if (section) {
            return section;
        }

        section = document.createElement('section');
        section.className = FORUM_SECTION_CLASS;
        section.dataset.dzrForumSection = kind;
        section.setAttribute('aria-labelledby', `${FORUM_TOP_ID}-${kind}-title`);
        const heading = document.createElement('h2');
        heading.id = `${FORUM_TOP_ID}-${kind}-title`;
        heading.textContent = label;
        section.appendChild(heading);
        const taxonomySection = top.querySelector('[data-dzr-forum-section="taxonomy"]');
        if (kind === 'subforums' && taxonomySection) {
            top.insertBefore(section, taxonomySection);
        } else {
            top.appendChild(section);
        }
        return section;
    }

    function moveForumNode(section, node) {
        if (!node || node.closest(`#${FORUM_TOP_ID}`)) {
            return;
        }
        const marker = document.createComment('dzr-forum-original-position');
        node.before(marker);
        section.appendChild(node);
        forumMovedNodes.push({ node, marker });
    }

    function findDesktopSubforum(root = document) {
        return Array.from(root.querySelectorAll('.bm.bmw.fl')).find(section =>
            section.querySelector('[id^="subforum_"], a[href*="mod=forumdisplay"][href*="fid="]')
        ) || null;
    }

    function findMobileSubforums(root = document) {
        return Array.from(root.querySelectorAll('.fl')).filter(section =>
            !section.closest(`#${FORUM_TOP_ID}`) &&
            section.querySelector('.bm_h') &&
            section.querySelector('a[href*="mod=forumdisplay"][href*="fid="]')
        );
    }

    function getLocalForumTopNodes(template) {
        if (template === 'touch') {
            return {
                subforums: [document.getElementById('subname_list')].filter(Boolean),
                taxonomy: []
            };
        }

        if (template === 'mobile') {
            return {
                subforums: findMobileSubforums(),
                taxonomy: Array.from(document.querySelectorAll('.box.ttp, .box.tst'))
            };
        }

        return {
            subforums: [findDesktopSubforum()].filter(Boolean),
            taxonomy: [document.getElementById('thread_types')].filter(Boolean)
        };
    }

    function shouldReorderForumTop(template) {
        if (template === 'mobile' || template === 'touch') {
            return true;
        }
        return typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches;
    }

    function buildForumFilterToggleUrl(linkHref, currentHref) {
        let linkUrl;
        let currentUrl;
        try {
            currentUrl = new URL(currentHref);
            linkUrl = new URL(linkHref, currentUrl);
        } catch (error) {
            return '';
        }

        const filterKey = ['typeid', 'sortid'].find(key =>
            linkUrl.searchParams.get(key) &&
            linkUrl.searchParams.get(key) === currentUrl.searchParams.get(key)
        );
        if (!filterKey) {
            return '';
        }

        const result = new URL(currentUrl.href);
        result.searchParams.delete(filterKey);
        result.searchParams.delete('page');
        const remainingKey = filterKey === 'typeid' ? 'sortid' : 'typeid';
        if (result.searchParams.get(remainingKey)) {
            result.searchParams.set('filter', remainingKey);
        } else if (result.searchParams.get('filter') === filterKey) {
            result.searchParams.delete('filter');
        }

        result.pathname = result.pathname.replace(
            /forum-(\d+)-\d+\.html$/i,
            'forum-$1-1.html'
        );
        result.hash = '';
        return result.href;
    }

    function applyForumMobileModeToUrl(linkHref, currentHref, fallbackMode = '') {
        let linkUrl;
        let currentUrl;
        try {
            currentUrl = new URL(currentHref);
            linkUrl = new URL(linkHref, currentUrl);
        } catch (error) {
            return '';
        }

        const mobileMode = currentUrl.searchParams.get('mobile') || fallbackMode;
        const supportedForumTarget = getForumListingInfo(linkUrl.href, currentUrl.origin) ||
            isForumIndexRoute(linkUrl.href, currentUrl.origin);
        if (!['1', '2', 'yes'].includes(mobileMode) ||
            linkUrl.origin !== currentUrl.origin || !supportedForumTarget) {
            return '';
        }

        linkUrl.searchParams.set('mobile', mobileMode);
        if (mobileMode === '2') {
            linkUrl.searchParams.delete('simpletype');
        }
        return linkUrl.href;
    }

    function applyForumMobileModeToLinks(root) {
        const template = getForumListingTemplate();
        const fallbackMode = template === 'touch' ? '2' : (template === 'mobile' ? '1' : '');
        root.querySelectorAll('a[href]').forEach(link => {
            const mobileUrl = applyForumMobileModeToUrl(
                link.getAttribute('href') || link.href,
                location.href,
                fallbackMode
            );
            if (mobileUrl) {
                link.href = mobileUrl;
            }
        });
    }

    function applyForumTaxonomyLinks(root) {
        applyForumMobileModeToLinks(root);
        root.querySelectorAll('.ttp a[href], .tst a[href]').forEach(link => {
            const toggleUrl = buildForumFilterToggleUrl(
                link.getAttribute('href') || link.href,
                location.href
            );
            if (!toggleUrl) {
                return;
            }
            link.href = toggleUrl;
            link.title = '再次点击取消筛选';
            link.setAttribute('aria-current', 'page');
        });
    }

    function enhanceForumPagination(root = document) {
        root.querySelectorAll('.pg').forEach((pagination, index) => {
            pagination.setAttribute('role', 'navigation');
            pagination.setAttribute('aria-label', `分页导航${index + 1}`);
            pagination.querySelector('.prev')?.setAttribute('aria-label', '上一页');
            pagination.querySelector('.nxt')?.setAttribute('aria-label', '下一页');
            pagination.querySelector('strong')?.setAttribute('aria-current', 'page');
            pagination.querySelectorAll('input[name="custompage"], kbd input').forEach(input => {
                input.setAttribute('inputmode', 'numeric');
                input.setAttribute('pattern', '[0-9]*');
                input.setAttribute('aria-label', '输入页码后按回车跳转');
            });
        });
    }

    function sanitizeImportedForumNode(node) {
        node.querySelectorAll('script, style, iframe, object, embed').forEach(child => child.remove());
        [node, ...node.querySelectorAll('*')].forEach(element => {
            Array.from(element.attributes || []).forEach(attribute => {
                if (/^on/i.test(attribute.name)) {
                    element.removeAttribute(attribute.name);
                }
            });
        });
        node.classList.add('dzr-forum-imported');
        return node;
    }

    async function readForumHtmlResponse(response) {
        if (typeof TextDecoder !== 'function') {
            return response.text();
        }

        const contentType = response.headers.get('content-type') || '';
        const charsetMatch = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i);
        const charset = charsetMatch?.[1] || document.characterSet || 'utf-8';
        const buffer = await response.arrayBuffer();
        try {
            return new TextDecoder(charset).decode(buffer);
        } catch (error) {
            return new TextDecoder('utf-8').decode(buffer);
        }
    }

    async function importMissingForumTopSections(top, generation, needsSubforums, needsTaxonomy) {
        if ((!needsSubforums && !needsTaxonomy) || typeof fetch !== 'function' ||
            typeof DOMParser !== 'function') {
            return;
        }

        let response;
        try {
            const mobileUrl = new URL(location.href);
            mobileUrl.searchParams.set('mobile', '1');
            mobileUrl.searchParams.set('simpletype', 'no');
            response = await fetch(mobileUrl.href, {
                credentials: 'same-origin',
                headers: { Accept: 'text/html' }
            });
        } catch (error) {
            console.warn('[Discuz Reader] Could not load mobile forum navigation.', error);
            return;
        }
        if (!response.ok) {
            return;
        }

        const sourceDocument = new DOMParser().parseFromString(
            await readForumHtmlResponse(response),
            'text/html'
        );
        if (generation !== forumEnhancementGeneration || !top.isConnected || !settings.enabled) {
            return;
        }

        if (needsSubforums) {
            const sourceSubforum = findMobileSubforums(sourceDocument)[0];
            if (sourceSubforum) {
                const section = createForumSection(top, 'subforums', '子版块');
                const imported = document.importNode(sourceSubforum, true);
                section.appendChild(sanitizeImportedForumNode(imported));
                applyForumMobileModeToLinks(section);
            }
        }

        if (needsTaxonomy) {
            const sourceTaxonomy = Array.from(
                sourceDocument.querySelectorAll('.box.ttp, .box.tst')
            );
            if (sourceTaxonomy.length) {
                const section = createForumSection(top, 'taxonomy', '主题分类与分类信息');
                sourceTaxonomy.forEach(node => {
                    const imported = document.importNode(node, true);
                    section.appendChild(sanitizeImportedForumNode(imported));
                });
                applyForumTaxonomyLinks(section);
            }
        }
    }

    function enhanceMobileForumIndex() {
        if (!settings.enabled) {
            return;
        }

        const groups = Array.from(document.querySelectorAll('.fl')).filter(group =>
            group.querySelector('.bm .bm_h')
        );

        groups.forEach((group, groupIndex) => {
            const heading = group.querySelector('.bm .bm_h');
            group.classList.add('dzr-forum-index-group');
            group.setAttribute('role', 'navigation');
            if (heading) {
                if (!heading.id) {
                    heading.id = `${SCRIPT_ID}-forum-index-heading-${groupIndex + 1}`;
                }
                group.setAttribute('aria-labelledby', heading.id);
            } else {
                group.setAttribute('aria-label', `论坛分类 ${groupIndex + 1}`);
            }

            group.querySelectorAll('.bm_c').forEach(row => {
                const forumLink = Array.from(row.querySelectorAll('a[href]')).find(link =>
                    Boolean(getForumListingInfo(link.href, location.origin))
                );
                forumLink?.classList.add('dzr-forum-index-link');
            });
            applyForumMobileModeToLinks(group);
        });

        document.querySelectorAll('body > .box').forEach(summary => {
            summary.setAttribute('aria-label', '论坛统计');
        });
    }

    function enhanceForumListing() {
        if (!settings.enabled) {
            clearForumListingEnhancement();
            return;
        }
        enhanceForumPagination();
        if (document.getElementById(FORUM_TOP_ID)) {
            return;
        }

        const template = getForumListingTemplate();
        const threadList = document.querySelector('#threadlist, .threadlist, .tl');
        if (!template || !threadList || !shouldReorderForumTop(template)) {
            return;
        }

        const top = document.createElement('nav');
        top.id = FORUM_TOP_ID;
        top.setAttribute('aria-label', '版面导航与主题分类');
        threadList.before(top);

        const nodes = getLocalForumTopNodes(template);
        if (nodes.subforums.length) {
            const section = createForumSection(top, 'subforums', '子版块');
            nodes.subforums.forEach(node => moveForumNode(section, node));
            applyForumMobileModeToLinks(section);
        }
        if (nodes.taxonomy.length) {
            const section = createForumSection(top, 'taxonomy', '主题分类与分类信息');
            nodes.taxonomy.forEach(node => moveForumNode(section, node));
            applyForumTaxonomyLinks(section);
        }

        const generation = ++forumEnhancementGeneration;
        void importMissingForumTopSections(
            top,
            generation,
            nodes.subforums.length === 0,
            nodes.taxonomy.length === 0
        );
    }

    function cleanEmptyBreakLines(root) {
        if (!settings.enabled || !settings.cleanBreaks || !root) {
            return;
        }

        root.querySelectorAll(`.${LINE_CLASS}`).forEach(line => {
            if (isEmptyElement(line)) {
                line.remove();
            }
        });
    }

    function cleanMessageBreaks(root) {
        if (!settings.enabled || !settings.cleanBreaks || !root) {
            return;
        }

        root.querySelectorAll('p').forEach(paragraph => {
            if (isEmptyElement(paragraph)) {
                paragraph.remove();
            }
        });

        Array.from(root.querySelectorAll('br')).forEach(br => {
            if (!br.isConnected) {
                return;
            }

            let next = br.nextSibling;
            while (next && next.nodeType === Node.TEXT_NODE && isBlankText(next.nodeValue)) {
                next = next.nextSibling;
            }
            if (next && next.nodeType === Node.ELEMENT_NODE && getUpperTagName(next) === 'BR') {
                br.remove();
            }
        });
        cleanEmptyBreakLines(root);
    }

    function hasBreak(root) {
        return Array.from(root.childNodes).some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (getUpperTagName(node) === 'BR' || hasBreak(node))
        );
    }

    function isFlowBlock(node) {
        return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(getUpperTagName(node));
    }

    function hasFlowBreak(root) {
        return Array.from(root.childNodes).some(node =>
            node.nodeType === Node.ELEMENT_NODE && !isFlowBlock(node) &&
            (getUpperTagName(node) === 'BR' || hasBreak(node))
        );
    }

    function splitInlineElementAtBreaks(element) {
        const groups = splitInlineNodesAtBreaks(Array.from(element.childNodes));
        if (groups.length === 1) {
            return [element];
        }

        const parts = groups.map((children, index) =>
            index === 0 ? element : element.cloneNode(false)
        );
        element.replaceChildren();
        parts.forEach((part, index) => part.append(...groups[index]));
        return parts;
    }

    function splitInlineNodesAtBreaks(nodes) {
        const groups = [[]];

        nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && getUpperTagName(node) === 'BR') {
                groups.push([]);
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                groups[groups.length - 1].push(node);
                return;
            }

            const parts = splitInlineElementAtBreaks(node);
            groups[groups.length - 1].push(parts[0]);
            parts.slice(1).forEach(part => groups.push([part]));
        });

        return groups;
    }

    function splitRootFlowNodes(nodes) {
        const chunks = [];
        let inlineNodes = [];

        function flushInlineNodes() {
            if (!inlineNodes.length) {
                return;
            }
            chunks.push({
                type: 'lines',
                groups: splitInlineNodesAtBreaks(inlineNodes)
            });
            inlineNodes = [];
        }

        nodes.forEach(node => {
            if (isFlowBlock(node)) {
                flushInlineNodes();
                chunks.push({ type: 'block', node });
            } else {
                inlineNodes.push(node);
            }
        });
        flushInlineNodes();
        return chunks;
    }

    function wrapDirectBreakLines(root) {
        if (!root) {
            return;
        }

        if (root.classList.contains(WRAPPED_ROOT_CLASS)) {
            const hasUnwrappedContent = Array.from(root.childNodes).some(node =>
                node.nodeType === Node.TEXT_NODE
                    ? !isBlankText(node.nodeValue)
                    : node.nodeType === Node.ELEMENT_NODE &&
                        !node.classList.contains(LINE_CLASS) && !isFlowBlock(node)
            );
            if (!hasFlowBreak(root) && !hasUnwrappedContent) {
                return;
            }
            restoreDirectBreakLines(root);
        }

        if (!hasFlowBreak(root)) {
            return;
        }

        const chunks = splitRootFlowNodes(Array.from(root.childNodes));
        const fragment = document.createDocumentFragment();
        chunks.forEach(chunk => {
            if (chunk.type === 'block') {
                fragment.appendChild(chunk.node);
                return;
            }
            chunk.groups.forEach(nodes => {
                const line = document.createElement('span');
                line.className = LINE_CLASS;
                line.append(...nodes);
                fragment.appendChild(line);
            });
        });

        root.replaceChildren();
        root.appendChild(fragment);
        root.classList.add(WRAPPED_ROOT_CLASS);
    }

    function restoreDirectBreakLines(root) {
        if (!root || !root.classList.contains(WRAPPED_ROOT_CLASS)) {
            return;
        }

        let previousWasLine = false;
        Array.from(root.childNodes).forEach(node => {
            const isLine = node.nodeType === Node.ELEMENT_NODE &&
                node.classList.contains(LINE_CLASS);
            if (!isLine) {
                previousWasLine = false;
                return;
            }

            if (previousWasLine) {
                node.before(document.createElement('br'));
            }
            while (node.firstChild) {
                node.before(node.firstChild);
            }
            node.remove();
            previousWasLine = true;
        });

        root.classList.remove(WRAPPED_ROOT_CLASS);
    }

    function formatPseudoParagraphs(root) {
        if (!root) {
            return;
        }

        const candidates = [root, ...root.querySelectorAll('p')];
        candidates.forEach(candidate => {
            if (settings.enabled && settings.enableIndent) {
                wrapDirectBreakLines(candidate);
            } else {
                restoreDirectBreakLines(candidate);
            }
        });
    }

    function stripLeadingIndentWhitespace(value) {
        const text = String(value || '');
        const match = text.match(LEADING_INDENT_WHITESPACE);
        const prefix = match ? match[0] : '';
        return {
            prefix,
            text: prefix ? text.slice(prefix.length) : text
        };
    }

    function getLeadingParagraphTextNodes(container) {
        if (!container || container.closest('pre, code, kbd, samp, textarea, .blockcode')) {
            return [];
        }

        const leadingNodes = [];
        let foundText = false;
        let blocked = false;

        function visit(parent) {
            for (let child = parent.firstChild; child; child = child.nextSibling) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const value = child.nodeValue || '';
                    leadingNodes.push(child);
                    if (!ONLY_INDENT_WHITESPACE.test(value)) {
                        foundText = true;
                        return true;
                    }
                    continue;
                }

                if (child.nodeType !== Node.ELEMENT_NODE) {
                    continue;
                }

                const element = child;
                const tagName = getUpperTagName(element);
                if (SPACING_EXCLUDED_TAGS.has(tagName) ||
                    TEXT_FLOW_BOUNDARY_TAGS.has(tagName) ||
                    element.isContentEditable ||
                    element.getAttribute('aria-hidden') === 'true') {
                    blocked = true;
                    return true;
                }

                if (visit(element)) {
                    return true;
                }
            }
            return false;
        }

        visit(container);
        return foundText && !blocked ? leadingNodes : [];
    }

    function removeAuthorIndentation(container) {
        const leadingNodes = getLeadingParagraphTextNodes(container);
        leadingNodes.forEach(node => {
            const result = stripLeadingIndentWhitespace(node.nodeValue);
            if (!result.prefix) {
                return;
            }
            removedIndentPrefixByNode.set(node, result.prefix);
            node.nodeValue = result.text;
        });
        return leadingNodes.length > 0;
    }

    function restoreAuthorIndentation(root) {
        if (!root) {
            return;
        }

        root.classList.remove(ROOT_PARAGRAPH_CLASS);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            if (removedIndentPrefixByNode.has(node)) {
                node.nodeValue = `${removedIndentPrefixByNode.get(node)}${node.nodeValue || ''}`;
                removedIndentPrefixByNode.delete(node);
            }
            node = walker.nextNode();
        }
    }

    function formatLeadingIndentation(root) {
        if (!root || !settings.enabled || !settings.enableIndent) {
            return;
        }

        if (!root.classList.contains(WRAPPED_ROOT_CLASS) && removeAuthorIndentation(root)) {
            root.classList.add(ROOT_PARAGRAPH_CLASS);
        }
        root.querySelectorAll(`p, .${LINE_CLASS}`).forEach(removeAuthorIndentation);
    }

    function getCjkEnglishSpacing(left, right) {
        if (PUNCTUATION_BEFORE_ASCII_CHARACTER.test(left) && ASCII_WORD_CHARACTER.test(right)) {
            return THIN_SPACE;
        }
        if ((HAN_CHARACTER.test(left) && ASCII_WORD_CHARACTER.test(right)) ||
            (ASCII_WORD_CHARACTER.test(left) && HAN_CHARACTER.test(right))) {
            return THIN_SPACE;
        }
        return '';
    }

    function addSpacingWithinText(text) {
        return String(text || '')
            .replace(/([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])([A-Za-z0-9])/g, `$1${THIN_SPACE}$2`)
            .replace(/([A-Za-z0-9])([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/g, `$1${THIN_SPACE}$2`)
            .replace(/([、。，．！？；：…—～·“”（）【】《》「」『』〔〕〈〉〖〗〘〙〚〛｛｝［］",!?;:])([A-Za-z0-9])/g, `$1${THIN_SPACE}$2`);
    }

    function restoreSpacing(root) {
        if (!root) {
            return;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            if (originalTextByNode.has(node)) {
                node.nodeValue = originalTextByNode.get(node);
                originalTextByNode.delete(node);
            }
            node = walker.nextNode();
        }
    }

    function addSpacingToRoot(root) {
        let previousTextNode = null;

        function visit(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const original = originalTextByNode.has(node)
                    ? originalTextByNode.get(node)
                    : (node.nodeValue || '');
                if (!original) {
                    return;
                }

                if (!originalTextByNode.has(node)) {
                    originalTextByNode.set(node, original);
                }

                let spaced = addSpacingWithinText(original);
                const boundary = previousTextNode
                    ? getCjkEnglishSpacing(previousTextNode.nodeValue.slice(-1), spaced.charAt(0))
                    : '';
                if (boundary) {
                    spaced = `${boundary}${spaced}`;
                }
                if (node.nodeValue !== spaced) {
                    node.nodeValue = spaced;
                }

                const last = spaced.slice(-1);
                previousTextNode = HAN_CHARACTER.test(last) ||
                    ASCII_WORD_CHARACTER.test(last) ||
                    PUNCTUATION_BEFORE_ASCII_CHARACTER.test(last)
                    ? node
                    : null;
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const element = node;
            const tagName = getUpperTagName(element);
            if (SPACING_EXCLUDED_TAGS.has(tagName) || element.isContentEditable ||
                element.getAttribute('aria-hidden') === 'true') {
                previousTextNode = null;
                return;
            }

            const boundary = TEXT_FLOW_BOUNDARY_TAGS.has(tagName) ||
                element.classList.contains(LINE_CLASS);
            if (boundary) {
                previousTextNode = null;
            }
            for (let child = element.firstChild; child; child = child.nextSibling) {
                visit(child);
            }
            if (boundary) {
                previousTextNode = null;
            }
        }

        for (let child = root.firstChild; child; child = child.nextSibling) {
            visit(child);
        }
    }

    function formatCjkEnglishSpacing(root) {
        if (settings.enabled && settings.spaceCjkEnglish) {
            addSpacingToRoot(root);
        }
    }

    function createByline(post) {
        if (!post) {
            return;
        }

        const pct = post.querySelector('.pct') || getMessageRoot(post)?.parentElement;
        if (!pct || pct.querySelector(':scope > .dzr-byline')) {
            return;
        }

        const authorAnchor = getPostAuthorAnchor(post);
        const authorUid = getPostAuthorId(post);
        const metadataRoot = getPostMetadataRoot(post);
        const timestamp = post.querySelector('[id^="authorposton"], .authi li.rela') ||
            (metadataRoot !== post ? metadataRoot.querySelector('[id^="authorposton"]') : null);
        const floor = post.querySelector('a[id^="postnum"], .authi li:first-child em') ||
            (metadataRoot !== post ? metadataRoot.querySelector(':scope > em') : null);
        const byline = document.createElement('div');
        byline.className = 'dzr-byline';

        if (authorAnchor) {
            const author = document.createElement('a');
            author.href = authorAnchor.href;
            author.target = '_blank';
            author.rel = 'noopener noreferrer';
            author.textContent = authorAnchor.textContent.trim() || '作者';
            byline.appendChild(author);
        } else {
            byline.append('匿名或已删除用户');
        }

        if (ownerId && authorUid === ownerId) {
            const badge = document.createElement('span');
            badge.className = 'dzr-owner-badge';
            badge.textContent = '帖主';
            byline.appendChild(badge);
        }

        const details = [timestamp?.textContent.trim(), floor?.textContent.trim()].filter(Boolean);
        if (details.length) {
            byline.append(` · ${details.join(' · ')}`);
        }

        pct.insertBefore(byline, pct.firstChild);
    }

    function refreshBylines() {
        document.querySelectorAll('.dzr-byline').forEach(byline => byline.remove());
        getPostContainers().forEach(createByline);
    }

    function processPosts() {
        const postList = document.querySelector('#postlist, .postlist, .vt');
        const shouldResumeObserver = Boolean(observer && postList);
        if (shouldResumeObserver) {
            observer.disconnect();
        }

        getPostContainers().forEach(post => {
            const root = getMessageRoot(post);
            if (!root) {
                return;
            }
            restoreSpacing(root);
            restoreAuthorIndentation(root);
            cleanMessageBreaks(root);
            root.classList.add('dzr-message');
            formatPseudoParagraphs(root);
            cleanEmptyBreakLines(root);
            formatLeadingIndentation(root);
            formatCjkEnglishSpacing(root);
        });

        refreshBylines();
        updateOwnerControl();

        if (shouldResumeObserver) {
            observer.observe(postList, { childList: true, subtree: true });
        }
    }

    function observePosts() {
        const postList = document.querySelector('#postlist, .postlist, .vt');
        if (!postList || typeof MutationObserver !== 'function') {
            return;
        }

        observer = new MutationObserver(() => {
            clearTimeout(observerTimer);
            observerTimer = setTimeout(() => {
                const detected = detectOwnerId();
                if (detected && detected !== ownerId) {
                    ownerId = detected;
                }
                processPosts();
            }, 120);
        });

        observer.observe(postList, { childList: true, subtree: true });
    }

    function getPageTurnViewportHeight() {
        return Math.max(
            1,
            window.visualViewport?.height ||
            document.documentElement.clientHeight ||
            window.innerHeight ||
            1
        );
    }

    function getPageTurnDistance() {
        const message = document.querySelector('.dzr-message');
        const lineHeight = message ? parseFloat(getComputedStyle(message).lineHeight) : NaN;
        const overlap = Number.isFinite(lineHeight)
            ? clamp(Math.round(lineHeight), 20, 56)
            : 32;
        return Math.max(1, getPageTurnViewportHeight() - overlap);
    }

    function turnPage(direction) {
        const scrollingElement = document.scrollingElement || document.documentElement;
        const maximumTop = Math.max(
            0,
            scrollingElement.scrollHeight - scrollingElement.clientHeight
        );
        const targetTop = clamp(
            scrollingElement.scrollTop + Number(direction) * getPageTurnDistance(),
            0,
            maximumTop
        );

        document.documentElement.classList.add(ROOT_INSTANT_TURN_CLASS);
        void getComputedStyle(document.documentElement).scrollBehavior;
        scrollingElement.scrollTop = targetTop;

        clearTimeout(pageTurnTimer);
        pageTurnTimer = setTimeout(() => {
            document.documentElement.classList.remove(ROOT_INSTANT_TURN_CLASS);
        }, 80);
    }

    function syncPageTurnControls() {
        if (!ui?.pageTurnControls) {
            return;
        }

        const shouldShow = pageKind === 'thread' &&
            settings.enabled && settings.showPageTurnControls;
        ui.pageTurnControls.hidden = !shouldShow;
        ui.host.dataset.pageTurnEnabled = String(shouldShow);
        document.documentElement.classList.toggle(ROOT_PAGE_TURN_CLASS, shouldShow);
    }

    function normalizeNextPageUrl(href, baseUrl, expectedThreadId = threadId) {
        if (!href) {
            return null;
        }

        let candidate;
        let base;
        try {
            base = new URL(baseUrl);
            candidate = new URL(href, base);
        } catch (error) {
            return null;
        }

        if (!/^https?:$/.test(candidate.protocol) || candidate.origin !== base.origin ||
            getThreadIdFromUrl(candidate.href) !== expectedThreadId) {
            return null;
        }

        const currentPage = getCurrentPageNumber(base.href);
        const candidatePage = getCurrentPageNumber(candidate.href);
        if (candidatePage <= currentPage) {
            return null;
        }

        ['authorid', 'mobile'].forEach(key => {
            const value = base.searchParams.get(key);
            if (value) {
                candidate.searchParams.set(key, value);
            }
        });
        candidate.hash = '';
        return candidate;
    }

    function getNextPageUrl(root = document, baseUrl = location.href) {
        const selectors = [
            'a[rel~="next"]',
            'a.nxt',
            '.pg a[href]',
            '.pgs a[href]',
            '.pages a[href]'
        ];
        const links = Array.from(root.querySelectorAll(selectors.join(', ')));
        let best = null;

        links.forEach(link => {
            const candidate = normalizeNextPageUrl(
                link.getAttribute('href') || link.href,
                baseUrl
            );
            if (!candidate) {
                return;
            }

            const page = getCurrentPageNumber(candidate.href);
            if (seamlessLoadedPages.has(page)) {
                return;
            }
            if (!best || page < getCurrentPageNumber(best.href)) {
                best = candidate;
            }
        });

        return best;
    }

    function getPostAppendRoot(root = document) {
        const desktop = root.querySelector('#postlist');
        if (desktop) {
            return desktop;
        }

        const touch = root.querySelector('.postlist');
        if (touch) {
            return touch;
        }

        const standard = root.querySelector('.vt');
        return standard ? (standard.querySelector('.bm') || standard) : null;
    }

    function getForumReturnCandidates() {
        const subject = document.querySelector('#thread_subject');
        const subjectContainer = subject?.closest('h1, h2, .ts, .bm_h') ||
            document.querySelector('.postlist > h2');

        return Array.from(document.querySelectorAll('a[href]')).map((link, index) => {
            if (link.closest(
                '[id^="postmessage_"], .message, .sign, .pbody, #' +
                SCRIPT_ID + '-ui-host, #' + RETURN_FOOTER_ID
            )) {
                return null;
            }

            const info = getForumListingInfo(
                link.getAttribute('href') || link.href,
                location.origin
            );
            if (!info) {
                return null;
            }

            let contextScore = 0;
            if (subjectContainer?.contains(link)) {
                contextScore = 500;
            } else if (link.closest('#pt, .breadcrumb, .breadbox')) {
                contextScore = 350;
            } else if (link.closest('.nav, .bm_h')) {
                contextScore = 200;
            }

            const filterScore = ['typeid', 'sortid'].reduce(
                (score, key) => score + (info.url.searchParams.get(key) ? 80 : 0),
                0
            );
            return {
                link,
                info,
                label: String(link.textContent || '').replace(/\s+/g, ' ').trim(),
                score: contextScore + filterScore + index / 10000
            };
        }).filter(Boolean);
    }

    function findReturnLabel(candidates, targetInfo) {
        const typeId = targetInfo.url.searchParams.get('typeid');
        const sortId = targetInfo.url.searchParams.get('sortid');
        const matches = candidates.filter(candidate => candidate.info.fid === targetInfo.fid);
        matches.sort((left, right) => {
            const matchScore = candidate => {
                let score = candidate.score;
                if (typeId && candidate.info.url.searchParams.get('typeid') === typeId) {
                    score += 1000;
                }
                if (sortId && candidate.info.url.searchParams.get('sortid') === sortId) {
                    score += 1000;
                }
                return score;
            };
            return matchScore(right) - matchScore(left);
        });
        return matches.find(candidate => candidate.label)?.label || '';
    }

    function resolveReturnTarget() {
        const candidates = getForumReturnCandidates();
        const referrerInfo = getForumListingInfo(document.referrer, location.origin);
        if (referrerInfo) {
            return {
                url: referrerInfo.url,
                label: findReturnLabel(candidates, referrerInfo),
                page: referrerInfo.page,
                source: 'referrer'
            };
        }

        if (!candidates.length) {
            return null;
        }

        const preferred = candidates.some(candidate => candidate.score >= 200)
            ? candidates.filter(candidate => candidate.score >= 200)
            : candidates;
        preferred.sort((left, right) => right.score - left.score);
        const selected = preferred[0];
        const contextualUrl = applyThreadContextToForumUrl(
            selected.info.url.href,
            location.href
        ) || selected.info.url;
        const targetInfo = getForumListingInfo(contextualUrl.href, location.origin);
        return targetInfo ? {
            url: targetInfo.url,
            label: findReturnLabel(candidates, targetInfo) || selected.label,
            page: targetInfo.page,
            source: 'document'
        } : null;
    }

    function syncReturnFooter() {
        const existing = document.getElementById(RETURN_FOOTER_ID);
        if (!settings.enabled) {
            existing?.remove();
            return;
        }

        const target = resolveReturnTarget();
        const appendRoot = getPostAppendRoot();
        if (!target || !appendRoot) {
            existing?.remove();
            return;
        }

        const footer = existing || document.createElement('nav');
        footer.id = RETURN_FOOTER_ID;
        footer.setAttribute('aria-label', '主题返回导航');
        footer.replaceChildren();

        const link = document.createElement('a');
        const label = target.label ? `返回：${target.label}` : '返回上级列表';
        link.href = target.url.href;
        link.className = 'dzr-return-link';
        link.setAttribute('aria-label', target.page > 1 ? `${label}，第 ${target.page} 页` : label);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        path.setAttribute('d', 'm15 18-6-6 6-6');
        svg.appendChild(path);

        const text = document.createElement('span');
        text.textContent = label;
        link.append(svg, text);
        if (target.page > 1) {
            const pageLabel = document.createElement('small');
            pageLabel.textContent = `第 ${target.page} 页`;
            link.appendChild(pageLabel);
        }
        footer.appendChild(link);
        appendRoot.appendChild(footer);
    }

    function getDirectChildWithin(node, root) {
        if (!node || !root || !root.contains(node)) {
            return null;
        }

        let current = node;
        while (current.parentElement && current.parentElement !== root) {
            current = current.parentElement;
        }
        return current.parentElement === root ? current : null;
    }

    function getMessagePostKey(message) {
        const messageMatch = String(message?.id || '').match(/^postmessage_(\d+)$/);
        if (messageMatch) {
            return messageMatch[1];
        }

        const post = message?.closest('[id^="pid"]');
        const postMatch = String(post?.id || '').match(/^pid(\d+)$/);
        return postMatch ? postMatch[1] : '';
    }

    function getPagePostUnits(sourceDocument) {
        const sourceRoot = getPostAppendRoot(sourceDocument);
        if (!sourceRoot) {
            return [];
        }

        const existingKeys = new Set(Array.from(document.querySelectorAll(
            '[id^="postmessage_"], .postlist > [id^="pid"] .message'
        ), getMessagePostKey).filter(Boolean));
        const selectedUnits = new Set();
        const messages = sourceDocument.querySelectorAll(
            '[id^="postmessage_"], .postlist > [id^="pid"] .message'
        );

        messages.forEach(message => {
            const key = getMessagePostKey(message);
            if (!key || existingKeys.has(key)) {
                return;
            }

            const metadata = sourceDocument.getElementById(`pid${key}`);
            [metadata, message].forEach(node => {
                const unit = getDirectChildWithin(node, sourceRoot);
                if (unit) {
                    selectedUnits.add(unit);
                }
            });
        });

        return Array.from(sourceRoot.children).filter(child => selectedUnits.has(child));
    }

    function getSeamlessSentinel() {
        let sentinel = document.getElementById(SEAMLESS_SENTINEL_ID);
        if (sentinel) {
            return sentinel;
        }

        const appendRoot = getPostAppendRoot();
        if (!appendRoot) {
            return null;
        }

        sentinel = document.createElement('div');
        sentinel.id = SEAMLESS_SENTINEL_ID;
        sentinel.setAttribute('role', 'status');
        sentinel.setAttribute('aria-live', 'polite');

        const messages = Array.from(document.querySelectorAll(
            '[id^="postmessage_"], .postlist > [id^="pid"] .message'
        ));
        const lastMessage = messages[messages.length - 1];
        const lastUnit = getDirectChildWithin(lastMessage, appendRoot);
        appendRoot.insertBefore(sentinel, lastUnit?.nextSibling || null);
        return sentinel;
    }

    function setSeamlessState(state, nextUrl = seamlessNextPageUrl) {
        const sentinel = document.getElementById(SEAMLESS_SENTINEL_ID);
        if (!sentinel) {
            return;
        }

        sentinel.dataset.state = state || '';
        sentinel.replaceChildren();
        if (state === 'loading') {
            sentinel.textContent = '正在加载下一页…';
        } else if (state === 'end') {
            sentinel.textContent = '已加载全部回复';
        } else if (state === 'error') {
            sentinel.append('下一页加载失败 · ');
            if (nextUrl) {
                const link = document.createElement('a');
                link.href = nextUrl.href;
                link.textContent = '打开下一页';
                sentinel.appendChild(link);
            }
        }
    }

    function clearSeamlessRequest() {
        if (seamlessRequest?.controller) {
            seamlessRequest.controller.abort();
        }
        seamlessRequest = null;
    }

    function prepareSeamlessRequest(nextUrl) {
        if (!nextUrl || typeof window.fetch !== 'function') {
            return false;
        }
        if (seamlessRequest?.url === nextUrl.href) {
            return true;
        }

        clearSeamlessRequest();
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const request = {
            url: nextUrl.href,
            controller,
            html: null,
            promise: null
        };
        seamlessRequest = request;
        request.promise = window.fetch(request.url, {
            cache: 'default',
            credentials: 'same-origin',
            redirect: 'follow',
            ...(controller ? { signal: controller.signal } : {})
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Next page request failed: ${response.status}`);
            }
            return response.text();
        }).then(html => {
            if (seamlessRequest !== request) {
                return null;
            }
            request.html = html;
            return html;
        }).catch(() => null);
        return true;
    }

    function stopSeamlessLoading(removeSentinel = true) {
        clearSeamlessRequest();
        seamlessAppendInProgress = false;
        if (seamlessObserver) {
            seamlessObserver.disconnect();
            seamlessObserver = null;
        }
        if (removeSentinel) {
            document.getElementById(SEAMLESS_SENTINEL_ID)?.remove();
        }
    }

    function isSeamlessSentinelNearViewport() {
        const sentinel = document.getElementById(SEAMLESS_SENTINEL_ID);
        return Boolean(sentinel && sentinel.getBoundingClientRect().top <= window.innerHeight + 800);
    }

    function scheduleNearbySeamlessAppend() {
        setTimeout(() => {
            if (settings.enabled && settings.seamlessLoading &&
                isSeamlessSentinelNearViewport()) {
                appendSeamlessNextPage();
            }
        }, 0);
    }

    function observeSeamlessBoundary() {
        const sentinel = getSeamlessSentinel();
        if (!sentinel) {
            return;
        }

        if (typeof IntersectionObserver === 'function') {
            seamlessObserver?.disconnect();
            seamlessObserver = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    appendSeamlessNextPage();
                }
            }, { rootMargin: '800px 0px' });
            seamlessObserver.observe(sentinel);
        } else if (!seamlessScrollFallbackBound) {
            seamlessScrollFallbackBound = true;
            window.addEventListener('scroll', () => {
                if (settings.enabled && settings.seamlessLoading &&
                    isSeamlessSentinelNearViewport()) {
                    appendSeamlessNextPage();
                }
            }, { passive: true });
        }

        scheduleNearbySeamlessAppend();
    }

    function createPageBoundary(pageUrl) {
        const boundary = document.createElement('div');
        const link = document.createElement('a');
        const page = getCurrentPageNumber(pageUrl.href);
        boundary.className = SEAMLESS_BOUNDARY_CLASS;
        boundary.dataset.page = String(page);
        boundary.setAttribute('role', 'separator');
        boundary.setAttribute('aria-label', `第 ${page} 页`);
        link.href = pageUrl.href;
        link.textContent = `第 ${page} 页`;
        link.title = `单独打开第 ${page} 页`;
        boundary.appendChild(link);
        return boundary;
    }

    function updateNativeNextLinks(nextUrl) {
        document.querySelectorAll('a.nxt, a[rel~="next"]').forEach(link => {
            if (nextUrl) {
                link.href = nextUrl.href;
            } else {
                link.remove();
            }
        });
    }

    async function appendSeamlessNextPage() {
        if (seamlessAppendInProgress || !seamlessRequest ||
            !settings.enabled || !settings.seamlessLoading) {
            return;
        }

        const request = seamlessRequest;
        const requestedUrl = new URL(request.url);
        const sentinel = getSeamlessSentinel();
        if (!sentinel) {
            return;
        }

        seamlessAppendInProgress = true;
        setSeamlessState('loading', requestedUrl);
        const html = request.html || await request.promise;

        if (!html || seamlessRequest !== request ||
            !settings.enabled || !settings.seamlessLoading) {
            seamlessAppendInProgress = false;
            if (seamlessRequest === request && settings.enabled && settings.seamlessLoading) {
                seamlessRequest = null;
                setSeamlessState('error', requestedUrl);
                seamlessObserver?.disconnect();
            }
            return;
        }

        const nextDocument = new DOMParser().parseFromString(html, 'text/html');
        const pageUnits = getPagePostUnits(nextDocument);
        const appendRoot = getPostAppendRoot();
        if (!appendRoot || !pageUnits.length || !sentinel.parentNode) {
            seamlessRequest = null;
            seamlessAppendInProgress = false;
            setSeamlessState('error', requestedUrl);
            seamlessObserver?.disconnect();
            return;
        }

        appendRoot.insertBefore(createPageBoundary(requestedUrl), sentinel);
        pageUnits.forEach(unit => {
            const imported = document.importNode(unit, true);
            imported.dataset.dzrSeamlessPage = String(getCurrentPageNumber(requestedUrl.href));
            appendRoot.insertBefore(imported, sentinel);
        });

        const loadedPage = getCurrentPageNumber(requestedUrl.href);
        seamlessLoadedPages.add(loadedPage);
        seamlessNextPageUrl = getNextPageUrl(nextDocument, requestedUrl.href);
        seamlessReachedEnd = !seamlessNextPageUrl;
        updateNativeNextLinks(seamlessNextPageUrl);
        seamlessRequest = null;
        seamlessAppendInProgress = false;
        processPosts();

        if (seamlessNextPageUrl) {
            setSeamlessState('');
            prepareSeamlessRequest(seamlessNextPageUrl);
            observeSeamlessBoundary();
        } else {
            seamlessObserver?.disconnect();
            seamlessObserver = null;
            setSeamlessState('end');
        }
    }

    function configureSeamlessLoading() {
        seamlessLoadedPages.add(getCurrentPageNumber(location.href));
        if (!settings.enabled || !settings.seamlessLoading) {
            stopSeamlessLoading(true);
            return;
        }

        if (seamlessReachedEnd) {
            if (seamlessLoadedPages.size > 1) {
                getSeamlessSentinel();
                setSeamlessState('end');
            }
            return;
        }

        seamlessNextPageUrl = seamlessNextPageUrl || getNextPageUrl();
        if (!seamlessNextPageUrl) {
            seamlessReachedEnd = true;
            stopSeamlessLoading(true);
            return;
        }

        getSeamlessSentinel();
        if (!prepareSeamlessRequest(seamlessNextPageUrl)) {
            setSeamlessState('error', seamlessNextPageUrl);
            return;
        }
        setSeamlessState('');
        observeSeamlessBoundary();
    }

    function getUiCss() {
        return `
            :host {
                color-scheme: light;
                font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
            }

            *, *::before, *::after { box-sizing: border-box; }
            [hidden] { display: none !important; }

            .page-turn-controls {
                position: fixed;
                inset: 0;
                z-index: 2147483643;
                pointer-events: none;
            }

            .page-turn-rail {
                position: fixed;
                top: 0;
                bottom: 0;
                display: grid;
                grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
                width: 32px;
                padding-block: env(safe-area-inset-top) env(safe-area-inset-bottom);
                pointer-events: auto;
            }

            .page-turn-left { left: env(safe-area-inset-left); }
            .page-turn-right { right: env(safe-area-inset-right); }

            .page-turn-rail button {
                display: flex;
                width: 32px;
                min-width: 32px;
                min-height: 0;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 0;
                border: 0;
                border-radius: 0;
                color: #111;
                background: #fff;
                box-shadow: none;
                cursor: pointer;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            .page-turn-left button { border-right: 1px solid #777; }
            .page-turn-right button { border-left: 1px solid #777; }
            .page-turn-rail button + button { border-top: 1px solid #aaa; }
            .page-turn-rail button:focus-visible {
                outline: 2px dashed #111;
                outline-offset: -3px;
            }
            .page-turn-rail svg {
                width: 12px;
                height: 12px;
                fill: none;
                stroke: currentColor;
                stroke-width: 2;
            }

            .toolbar {
                position: fixed;
                right: max(12px, env(safe-area-inset-right));
                bottom: max(12px, env(safe-area-inset-bottom));
                z-index: 2147483645;
                display: flex;
                align-items: center;
                border-radius: 8px;
                box-shadow: 0 2px 0 #111;
            }

            :host([data-page-turn-enabled="true"]) .toolbar {
                right: max(44px, calc(44px + env(safe-area-inset-right)));
            }

            .tool {
                display: inline-flex;
                width: 44px;
                min-width: 44px;
                min-height: 44px;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 2px solid #111;
                border-radius: 0;
                color: #111;
                background: #fff;
                box-shadow: none;
                font: 800 14px/1 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                text-decoration: none;
                cursor: pointer;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            .tool:first-child { border-radius: 8px 0 0 8px; }
            .tool:last-child { border-left: 0; border-radius: 0 8px 8px 0; }
            .tool[hidden] + .tool { border-left: 2px solid #111; border-radius: 8px; }
            .tool:hover { position: relative; z-index: 1; background: #eee; }
            .tool:active { background: #d8d8d8; }
            .tool:focus-visible {
                position: relative;
                z-index: 2;
                outline: 3px solid #1769e0;
                outline-offset: 3px;
            }
            .tool[hidden] { display: none; }
            .tool[data-active="true"],
            .tool[data-active="true"]:hover,
            .tool[data-active="true"]:active { color: #fff; background: #111; }

            .backdrop {
                position: fixed;
                inset: 0;
                z-index: 2147483646;
                display: grid;
                place-items: center;
                padding: 8px;
                background: rgba(0, 0, 0, .52);
                overscroll-behavior: none;
            }

            .backdrop[hidden] { display: none; }

            .panel {
                width: min(760px, 100%);
                max-height: calc(100vh - 16px);
                max-height: calc(100dvh - 16px);
                overflow: hidden;
                border: 2px solid #111;
                border-radius: 9px;
                color: #111;
                background: #fff;
                box-shadow: 4px 4px 0 #111;
            }

            .panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-height: 48px;
                padding: 5px 10px 5px 12px;
                border-bottom: 2px solid #111;
                background: #fff;
            }

            h2 { margin: 0; font-size: 17px; line-height: 1.2; }
            .version { color: #555; font-size: 11px; font-weight: 500; }

            .close {
                min-width: 42px;
                min-height: 38px;
                border: 1px solid #333;
                border-radius: 7px;
                color: #111;
                background: #fff;
                font: 700 14px/1 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                cursor: pointer;
                touch-action: manipulation;
            }

            .close:focus-visible, input:focus-visible, select:focus-visible,
            .action:focus-visible {
                outline: 3px solid #1769e0;
                outline-offset: 2px;
            }

            form {
                display: grid;
                grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
                grid-template-areas:
                    "reading type"
                    "font type"
                    "actions actions";
                gap: 7px;
                padding: 7px;
            }

            fieldset {
                min-width: 0;
                margin: 0;
                padding: 5px 8px 7px;
                border: 1px solid #777;
                border-radius: 6px;
            }

            .reading-settings { grid-area: reading; }
            .font-settings { grid-area: font; }
            .type-settings { grid-area: type; }

            legend { padding: 0 5px; font-size: 13px; font-weight: 800; }

            .check-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                column-gap: 8px;
            }

            .check {
                display: flex;
                min-width: 0;
                min-height: 40px;
                align-items: center;
                gap: 7px;
                padding: 2px 0;
                font-size: 13px;
                line-height: 1.2;
                cursor: pointer;
                touch-action: manipulation;
            }

            .check input {
                flex: 0 0 auto;
                width: 18px;
                height: 18px;
                margin: 0;
                accent-color: #111;
            }

            .field { display: grid; gap: 5px; margin-bottom: 5px; }
            .field:last-child { margin-bottom: 0; }
            .field > label { font-size: 13px; font-weight: 700; }

            .compact-field {
                grid-template-columns: 62px minmax(0, 1fr);
                align-items: center;
            }

            .custom-font-row {
                grid-template-columns: 62px minmax(0, 1fr) auto;
            }

            .custom-weight {
                min-height: 38px;
                white-space: nowrap;
            }

            .range-field {
                grid-template-columns: 62px minmax(0, 1fr) 58px;
                align-items: center;
                margin-bottom: 1px;
            }

            .range-row {
                display: contents;
            }

            input[type="range"] {
                width: 100%;
                min-height: 38px;
                margin: 0;
                accent-color: #111;
            }

            input[type="number"], input[type="text"], select {
                width: 100%;
                min-height: 38px;
                padding: 5px 7px;
                border: 1px solid #555;
                border-radius: 5px;
                color: #111;
                background: #fff;
                font: 13px/1.3 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
            }

            .actions {
                grid-area: actions;
                display: grid;
                grid-template-columns: 1fr 1.4fr;
                gap: 7px;
                margin: 0;
                padding: 7px 0 0;
                border-top: 1px solid #aaa;
                background: #fff;
            }

            .action {
                min-height: 40px;
                padding: 6px 8px;
                border: 1px solid #333;
                border-radius: 7px;
                color: #111;
                background: #fff;
                font: 700 14px/1.2 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
                cursor: pointer;
                touch-action: manipulation;
            }

            .action.primary { color: #fff; background: #111; }

            @media (max-width: 639px) {
                .panel { width: min(520px, 100%); box-shadow: 3px 3px 0 #111; }
                .backdrop { padding: 6px; }
                .toolbar { right: 8px; bottom: max(8px, env(safe-area-inset-bottom)); }
                form {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas: "reading" "font" "type" "actions";
                    gap: 5px;
                    padding: 5px;
                }
            }

            @media (max-width: 359px) {
                .reading-settings .check-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    column-gap: 4px;
                }
                .reading-settings .check {
                    gap: 4px;
                    font-size: 11px;
                }
            }

            @media (max-height: 720px) {
                .panel-header { min-height: 42px; padding-block: 3px; }
                h2 { font-size: 16px; }
                .close { min-height: 34px; }
                form { gap: 3px; padding: 3px; }
                fieldset { padding: 3px 6px 4px; }
                legend { font-size: 12px; }
                .check { min-height: 34px; font-size: 12px; }
                .check input { width: 17px; height: 17px; }
                .field { margin-bottom: 2px; }
                .field > label { font-size: 12px; }
                .compact-field, .range-field { grid-template-columns: 56px minmax(0, 1fr) 54px; }
                .compact-field:not(.custom-font-row) { grid-template-columns: 56px minmax(0, 1fr); }
                input[type="range"], input[type="number"], input[type="text"], select {
                    min-height: 32px;
                }
                .custom-weight { min-height: 32px; }
                .actions { gap: 5px; padding-top: 4px; }
                .action { min-height: 36px; padding-block: 4px; font-size: 12px; }
            }

            @media (max-height: 520px) and (min-width: 560px) {
                .panel { width: min(760px, 100%); }
                form {
                    grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
                    grid-template-areas: "reading type" "font type" "actions actions";
                }
            }

        `;
    }

    function settingControlHtml() {
        const fontOptions = Object.entries(FONT_PRESETS)
            .map(([id, preset]) => `<option value="${id}">${preset.label}</option>`)
            .join('');

        return `
            <div class="page-turn-controls" id="page-turn-controls" role="group" aria-label="双侧整页翻页工具" hidden="hidden">
                <div class="page-turn-rail page-turn-left" role="group" aria-label="左侧翻页按钮">
                    <button type="button" data-page-turn-direction="-1" aria-label="左侧向上翻一页" title="向上翻一页">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"></path></svg>
                    </button>
                    <button type="button" data-page-turn-direction="1" aria-label="左侧向下翻一页" title="向下翻一页">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>
                    </button>
                </div>
                <div class="page-turn-rail page-turn-right" role="group" aria-label="右侧翻页按钮">
                    <button type="button" data-page-turn-direction="-1" aria-label="右侧向上翻一页" title="向上翻一页">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"></path></svg>
                    </button>
                    <button type="button" data-page-turn-direction="1" aria-label="右侧向下翻一页" title="向下翻一页">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>
                    </button>
                </div>
            </div>
            <div class="toolbar" aria-label="Discuz 阅读工具">
                <a class="tool" id="owner-filter" hidden="hidden">主</a>
                <button class="tool" id="open-settings" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="打开阅读排版设置">Aa</button>
            </div>
            <div class="backdrop" id="backdrop" hidden="hidden">
                <section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
                    <header class="panel-header">
                        <h2 id="panel-title">随缘居阅读优化 <span class="version">v1.4.0</span></h2>
                        <button class="close" id="close-settings" type="button" aria-label="关闭并撤销未保存的设置">关闭</button>
                    </header>
                    <form id="settings-form">
                        <fieldset class="reading-settings">
                            <legend>阅读模式</legend>
                            <div class="check-grid">
                                <label class="check"><input name="enabled" type="checkbox" />启用重排</label>
                                <label class="check"><input name="focusMode" type="checkbox" />专注单栏</label>
                                <label class="check"><input name="hideSignatures" type="checkbox" />隐藏签名</label>
                                <label class="check"><input name="highContrast" type="checkbox" />黑白高对比</label>
                                <label class="check"><input name="showPageTurnControls" type="checkbox" />双侧翻页键</label>
                                <label class="check"><input name="seamlessLoading" type="checkbox" />无缝加载</label>
                            </div>
                        </fieldset>

                        <fieldset class="font-settings">
                            <legend>字体</legend>
                            <div class="field compact-field">
                                <label for="font-preset">正文字体</label>
                                <select id="font-preset" name="fontPreset">${fontOptions}</select>
                            </div>
                            <div class="field compact-field custom-font-row" id="custom-font-field">
                                <label for="custom-font">自定义</label>
                                <input id="custom-font" name="customFont" type="text" maxlength="200" placeholder='例如："Source Han Serif SC", serif' />
                                <label class="check custom-weight"><input name="customFontBold" type="checkbox" />600</label>
                            </div>
                        </fieldset>

                        <fieldset class="type-settings">
                            <legend>中文排版</legend>
                            ${rangeField('fontSize', '正文字号', 14, 30, 1, 'px')}
                            ${rangeField('lineHeight', '行高', 1.4, 2.4, 0.05, '')}
                            ${rangeField('letterSpacing', '字间距', -0.02, 0.12, 0.01, 'em')}
                            ${rangeField('paragraphSpacing', '段间距', 0, 2, 0.1, 'em')}
                            ${rangeField('maxWidth', '正文宽度', 30, 64, 1, 'em')}
                            <div class="check-grid">
                                <label class="check"><input name="enableIndent" type="checkbox" />首行缩进</label>
                                <label class="check"><input name="justifyText" type="checkbox" />两端对齐</label>
                                <label class="check"><input name="cleanBreaks" type="checkbox" />清理空行</label>
                                <label class="check"><input name="spaceCjkEnglish" type="checkbox" />中英文间距</label>
                            </div>
                        </fieldset>

                        <div class="actions">
                            <button class="action" id="reset-settings" type="button">恢复默认</button>
                            <button class="action primary" type="submit">保存设置</button>
                        </div>
                    </form>
                </section>
            </div>
        `;
    }

    function rangeField(name, label, minimum, maximum, step, unit) {
        return `
            <div class="field range-field">
                <label for="${name}-range">${label}</label>
                <div class="range-row">
                    <input id="${name}-range" data-range-for="${name}" type="range" min="${minimum}" max="${maximum}" step="${step}" />
                    <input name="${name}" type="number" min="${minimum}" max="${maximum}" step="${step}" aria-label="${label}（${unit || '数值'}）" />
                </div>
            </div>
        `;
    }

    function createUi() {
        const host = document.createElement('div');
        host.id = `${SCRIPT_ID}-ui-host`;
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = getUiCss();
        shadow.appendChild(style);

        const shell = document.createElement('div');
        shell.innerHTML = settingControlHtml();
        shadow.appendChild(shell);
        (document.body || document.documentElement).appendChild(host);

        ui = {
            host,
            shadow,
            backdrop: shadow.getElementById('backdrop'),
            form: shadow.getElementById('settings-form'),
            ownerFilter: shadow.getElementById('owner-filter'),
            pageTurnControls: shadow.getElementById('page-turn-controls'),
            openButton: shadow.getElementById('open-settings'),
            closeButton: shadow.getElementById('close-settings'),
            resetButton: shadow.getElementById('reset-settings'),
            customFontField: shadow.getElementById('custom-font-field'),
            settingsBeforeOpen: null,
            previouslyFocused: null,
            previousRootOverflow: ''
        };

        ui.openButton.addEventListener('click', openSettings);
        ui.ownerFilter.addEventListener('click', prepareOwnerFilterNavigation);
        ui.pageTurnControls.querySelectorAll('[data-page-turn-direction]').forEach(button => {
            button.addEventListener('click', () => turnPage(button.dataset.pageTurnDirection));
        });
        ui.closeButton.addEventListener('click', cancelAndCloseSettings);
        ui.resetButton.addEventListener('click', () => {
            settings = { ...DEFAULT_SETTINGS };
            populateForm(settings);
            applySettings();
        });
        ui.backdrop.addEventListener('click', event => {
            if (event.target === ui.backdrop) {
                cancelAndCloseSettings();
            }
        });
        ui.form.addEventListener('input', handleFormInput);
        ui.form.addEventListener('change', handleFormInput);
        ui.form.addEventListener('submit', event => {
            event.preventDefault();
            settings = readFormSettings();
            writeStoredSettings(settings);
            applySettings();
            closeSettings();
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !ui.backdrop.hidden) {
                cancelAndCloseSettings();
            }
            if (event.shiftKey && event.altKey && event.code === 'KeyD') {
                event.preventDefault();
                ui.backdrop.hidden ? openSettings() : cancelAndCloseSettings();
            }
        });

        ui.shadow.addEventListener('keydown', trapDialogFocus);

        populateForm(settings);
        updateOwnerControl();
    }

    function populateForm(value) {
        if (!ui) {
            return;
        }

        Object.entries(value).forEach(([key, settingValue]) => {
            const control = ui.form.elements.namedItem(key);
            if (!control) {
                return;
            }
            if (control.type === 'checkbox') {
                control.checked = Boolean(settingValue);
            } else {
                control.value = String(settingValue);
            }
        });

        ui.form.querySelectorAll('[data-range-for]').forEach(range => {
            const input = ui.form.elements.namedItem(range.dataset.rangeFor);
            range.value = input.value;
        });
        updateCustomFontVisibility();
    }

    function readFormSettings() {
        const value = {};
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            const control = ui.form.elements.namedItem(key);
            if (!control) {
                return;
            }
            value[key] = control.type === 'checkbox' ? control.checked : control.value;
        });
        return normalizeSettings(value);
    }

    function handleFormInput(event) {
        const target = event.target;
        if (target.matches('[data-range-for]')) {
            const numberInput = ui.form.elements.namedItem(target.dataset.rangeFor);
            numberInput.value = target.value;
        } else if (target.type === 'number') {
            const range = ui.form.querySelector(`[data-range-for="${target.name}"]`);
            if (range) {
                range.value = target.value;
            }
        }

        settings = readFormSettings();
        updateCustomFontVisibility();
        applySettings();
    }

    function updateCustomFontVisibility() {
        const custom = ui.form.elements.namedItem('fontPreset').value === 'custom';
        ui.customFontField.hidden = !custom;
    }

    function openSettings() {
        ui.settingsBeforeOpen = { ...settings };
        ui.previouslyFocused = ui.shadow.activeElement || document.activeElement;
        populateForm(settings);
        ui.backdrop.hidden = false;
        ui.openButton.setAttribute('aria-expanded', 'true');
        ui.previousRootOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        ui.closeButton.focus();
    }

    function closeSettings() {
        ui.backdrop.hidden = true;
        ui.openButton.setAttribute('aria-expanded', 'false');
        document.documentElement.style.overflow = ui.previousRootOverflow;
        ui.previousRootOverflow = '';
        ui.settingsBeforeOpen = null;
        const focusTarget = ui.previouslyFocused && typeof ui.previouslyFocused.focus === 'function'
            ? ui.previouslyFocused
            : ui.openButton;
        ui.previouslyFocused = null;
        focusTarget.focus();
    }

    function trapDialogFocus(event) {
        if (event.key !== 'Tab' || ui.backdrop.hidden) {
            return;
        }

        const focusable = Array.from(ui.backdrop.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
            'textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )).filter(element => !element.hidden && !element.closest('[hidden]'));

        if (!focusable.length) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && ui.shadow.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && ui.shadow.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function cancelAndCloseSettings() {
        if (ui.settingsBeforeOpen) {
            settings = { ...ui.settingsBeforeOpen };
            populateForm(settings);
            applySettings();
        }
        closeSettings();
    }

    function updateOwnerControl() {
        if (!ui) {
            return;
        }

        if (!ownerId || !threadId) {
            ui.ownerFilter.hidden = true;
            return;
        }

        const active = isOwnerFilterActive();
        const actionLabel = active ? '查看全部回复' : '只看帖主';
        ui.ownerFilter.hidden = false;
        ui.ownerFilter.dataset.active = String(active);
        ui.ownerFilter.textContent = '主';
        ui.ownerFilter.title = actionLabel;
        ui.ownerFilter.setAttribute(
            'aria-label',
            active
                ? '显示全部回复，并从最近未读楼层继续'
                : '只显示帖主发布的内容，并从最近未读楼层继续'
        );
        if (active) {
            ui.ownerFilter.setAttribute('aria-current', 'page');
        } else {
            ui.ownerFilter.removeAttribute('aria-current');
        }
        ui.ownerFilter.href = buildAuthorFilterUrl(location.href, threadId, ownerId, active);
    }

    function registerMenuCommand() {
        if (typeof GM_registerMenuCommand !== 'function') {
            return;
        }
        try {
            GM_registerMenuCommand('打开随缘居阅读优化设置', openSettings);
        } catch (error) {
            console.warn('[Discuz Reader] Could not register menu command.', error);
        }
    }

    const TEST_API = {
        addSpacingWithinText,
        applyForumMobileModeToUrl,
        applyThreadContextToForumUrl,
        buildAuthorFilterUrl,
        buildForumFilterToggleUrl,
        getAuthorIdFromHref,
        getCurrentPageNumber,
        getForumListingInfo,
        getThreadIdFromUrl,
        getUidFromHref,
        isForumIndexRoute,
        isMobileForumIndexDom,
        isMobileForumIndexUrl,
        isEmptyElement,
        normalizeNextPageUrl,
        normalizeSettings,
        resolvePageKindFromSignals,
        resolveOwnerCandidate,
        sanitizeFontFamily,
        splitInlineNodesAtBreaks,
        splitRootFlowNodes,
        stripLeadingIndentWhitespace
    };

    if (globalThis.__DZR_TEST_MODE__) {
        globalThis.__DZR_TEST_API__ = TEST_API;
        return;
    }

    const threadPage = isDiscuzThreadPage();
    pageKind = resolvePageKindFromSignals(
        threadPage,
        Boolean(getForumListingInfo(location.href, location.origin)),
        Boolean(getForumListingTemplate()),
        isMobileForumIndexUrl(location.href, location.origin),
        isMobileForumIndexDom()
    );
    if (!pageKind) {
        return;
    }

    settings = normalizeSettings(readStoredSettings());
    if (pageKind === 'thread') {
        threadId = getThreadId();
        ownerId = detectOwnerId();
    }
    createUi();
    registerMenuCommand();
    applySettings();
    if (pageKind === 'thread') {
        restoreOwnerFilterPosition();
        observePosts();
    }
})();
