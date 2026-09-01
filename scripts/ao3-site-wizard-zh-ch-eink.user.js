// ==UserScript==
// @name         AO3: Site Wizard - ZH-CN & E-Ink Reader Optimised
// @name:zh-CN   AO3：Site Wizard - 中文 & 墨水屏设备优化版
// @namespace    https://greasyfork.org/users/1639523-syoius
// @version      2.2.3
// @description  A compact reading-focused edition of AO3: Site Wizard with LXGW WenKai, enhanced blank-line cleanup, resilient settings storage, and configurable reading layout.
// @description:zh-CN  AO3 阅读优化脚本：集成霞鹜文楷、正文排版、异常空行清理、兼容式设置存储、高对比度模式及紧凑触控设置面板。
// @author       syoius
// @match        *://archiveofourown.org/*
// @match        *://*.archiveofourown.org/*
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// @connect      api.greasyfork.org
// @run-at       document-start
// ==/UserScript==

/*
 * AO3: Site Wizard - WenKai Reading Edition
 *
 * This script is a modified edition of:
 *
 *   AO3: Site Wizard
 *   Original author: BlackBatCat
 *   https://greasyfork.org/scripts/550537-ao3-site-wizard
 *
 * The original AO3: Site Wizard is distributed under the MIT License.
 *
 * Major changes in this edition include:
 *
 * - LXGW WenKai Screen as the default reading font
 * - independently selectable CJK and Latin reading fonts
 * - enhanced removal of empty paragraphs and nested blank elements
 * - first-line indentation for BR-separated pseudo paragraphs
 * - optional spacing at Chinese / English and punctuation / English boundaries
 * - selectable seamless next-chapter loading / prefetch modes
 * - low-frequency update checks with an in-page notification
 * - special handling for ACE-generated pseudo blank lines
 * - cleanup of Unicode / zero-width whitespace
 * - MutationObserver-based cleanup of dynamically inserted content
 * - timestamped GM Storage with an AO3 localStorage fallback
 * - automatic recovery from unavailable or non-persistent GM APIs
 * - compact settings panel designed for desktop, tablet, and e-ink devices
 * - save-without-closing settings workflow
 * - high-contrast black-text / white-background reading mode
 *
 *
 * MIT License
 *
 * Copyright (c) BlackBatCat
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 *
 * External fonts:
 *
 *   LXGW WenKai Screen Web
 *   https://github.com/CMBill/lxgw-wenkai-screen-web
 *
 *   Clear Han Serif
 *   https://fontsapi.zeoseven.com/79/main/result.css
 *
 *   Chill Jinshu Song Pro
 *   https://fontsapi.zeoseven.com/2246/main/result.css
 *
 *   KingHwa Old Song
 *   https://fontsapi.zeoseven.com/309/main/result.css
 *
 *   Cheese Foam Oolong Song
 *   https://fontsapi.zeoseven.com/2328/main/result.css
 *
 *   ChillKai
 *   https://fontsapi.zeoseven.com/5/main/result.css
 *
 *   Sarasa UI SC
 *   https://fontsapi.zeoseven.com/214/main/result.css
 *
 *   ShangTu DongGuan font
 *   https://fontsapi.zeoseven.com/488/main/result.css
 *
 *   Atkinson Hyperlegible, Literata, and Source Serif 4
 *   https://fontsource.org/
 *
 *   Google Sans and Merriweather
 *   https://fontsapi.zeoseven.com/
 *
 * This userscript is unofficial and is not affiliated with or endorsed by
 * Archive of Our Own (AO3) or the Organization for Transformative Works (OTW).
 */


(function () {
    'use strict';


    // ============================================================
    // 1. External font
    // ============================================================

    /*
     * Version is pinned instead of using @latest so that future upstream
     * updates do not unexpectedly change the appearance of the script.
     */

    const cdnFontCss = `
        @import url(
            'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-web@1.522.0/style.css'
        );
    `;

    GM_addStyle(cdnFontCss);


    // ============================================================
    // 2. Settings
    // ============================================================

    const SETTINGS_KEY =
        'ao3_site_wizard_settings';


    const NEXT_CHAPTER_LOADING_MODES =
        new Set([
            'none',
            'seamless',
            'prefetch'
        ]);


    const FONT_PRESETS = {

        system: {
            fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
            fontWeight:
                '400'
        },

        wenkai: {
            fontFamily:
                '"LXGW WenKai GB Screen", "LXGW WenKai Screen", serif',
            fontWeight:
                '400'
        },

        clearHanSerif: {
            fontFamily:
                '"Clear Han Serif", serif',
            fontWeight:
                '400',
            cssUrl:
                'https://fontsapi.zeoseven.com/79/main/result.css'
        },

        jinshuSong: {
            fontFamily:
                '"寒蝉锦书宋Pro", serif',
            fontWeight:
                '400',
            cssUrl:
                'https://fontsapi.zeoseven.com/2246/main/result.css'
        },

        kingHwaOldSong: {
            fontFamily:
                '"KingHwaOldSong", serif',
            fontWeight:
                '600',
            cssUrl:
                'https://fontsapi.zeoseven.com/309/main/result.css'
        },

        cheeseFoamOolong: {
            fontFamily:
                '"Cheese Foam Oolong Song", serif',
            fontWeight:
                '400',
            cssUrl:
                'https://fontsapi.zeoseven.com/2328/main/result.css'
        },

        chillKai: {
            fontFamily:
                '"ChillKai", serif',
            fontWeight:
                '600',
            cssUrl:
                'https://fontsapi.zeoseven.com/5/main/result.css'
        },

        sarasaUiSC: {
            fontFamily:
                '"Sarasa UI SC", sans-serif',
            fontWeight:
                '400',
            cssUrl:
                'https://fontsapi.zeoseven.com/214/main/result.css'
        },

        dongGuan: {
            fontFamily:
                '"STDongGuanTi", serif',
            fontWeight:
                '400',
            cssUrl:
                'https://fontsapi.zeoseven.com/488/main/result.css'
        },

        custom: {
            fontFamily:
                ''
        }
    };


    const FONT_PRESET_IDS =
        new Set(
            Object.keys(
                FONT_PRESETS
            )
        );


    const LEGACY_FONT_PRESET_MAP = {
        zhisong:
            'jinshuSong',
        zhisongOnline:
            'jinshuSong',
        zhuque:
            'dongGuan',
        sourceHanSans:
            'sarasaUiSC'
    };


    const LATIN_FONT_PRESETS = {

        follow: {
            fontFamily:
                ''
        },

        atkinson: {
            fontFamily:
                '"Atkinson Hyperlegible"',
            cssUrls: [
                'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.2.8/400.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.2.8/400-italic.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.2.8/700.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/atkinson-hyperlegible@5.2.8/700-italic.css'
            ]
        },

        googleSans: {
            fontFamily:
                '"Google Sans"',
            cssUrl:
                'https://fontsapi.zeoseven.com/912/main/result.css'
        },

        merriweather: {
            fontFamily:
                '"Merriweather"',
            cssUrl:
                'https://fontsapi.zeoseven.com/682/main/result.css'
        },

        literata: {
            fontFamily:
                '"Literata"',
            cssUrls: [
                'https://cdn.jsdelivr.net/npm/@fontsource/literata@5.2.6/400.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/literata@5.2.6/400-italic.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/literata@5.2.6/700.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/literata@5.2.6/700-italic.css'
            ]
        },

        sourceSerif: {
            fontFamily:
                '"Source Serif 4"',
            cssUrls: [
                'https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.3.0/400.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.3.0/400-italic.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.3.0/700.css',
                'https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5.3.0/700-italic.css'
            ]
        }
    };


    const LATIN_FONT_PRESET_IDS =
        new Set(
            Object.keys(
                LATIN_FONT_PRESETS
            )
        );


    function getPresetWorkFont(
        fontPreset,
        customWorkFont = ''
    ) {

        if (fontPreset === 'custom') {
            return String(
                customWorkFont || ''
            ).trim();
        }


        return FONT_PRESETS[
            fontPreset
        ]?.fontFamily ||
            FONT_PRESETS.wenkai.fontFamily;
    }


    function getPresetFontWeight(
        fontPreset,
        customFontBold = false
    ) {

        if (fontPreset === 'custom') {
            return customFontBold
                ? '600'
                : '400';
        }


        return FONT_PRESETS[
            fontPreset
        ]?.fontWeight ||
            '400';
    }


    function getCombinedWorkFont(
        fontPreset,
        customWorkFont,
        latinFontPreset
    ) {

        const workFont =
            getPresetWorkFont(
                fontPreset,
                customWorkFont
            );


        const latinFont =
            LATIN_FONT_PRESETS[
                latinFontPreset
            ]?.fontFamily ||
            '';


        return latinFont
            ? `${latinFont}, ${workFont}`
            : workFont;
    }


    function inferFontPreset(workFont) {

        const normalizedFont =
            String(workFont || '')
                .trim();


        if (
            normalizedFont ===
                '"LXGW Neo ZhiSong Screen", "LXGW Neo ZhiSong", serif' ||
            normalizedFont ===
                '"LXGW Neo ZhiSong CHS", "LXGW Neo ZhiSong", serif'
        ) {
            return 'jinshuSong';
        }


        if (
            normalizedFont ===
            '"Zhuque Fangsong (technical preview)", "Zhuque Fangsong", FangSong, serif'
        ) {
            return 'dongGuan';
        }


        if (
            normalizedFont ===
            '"Noto Sans SC", "Source Han Sans CN", "Noto Sans CJK SC", sans-serif'
        ) {
            return 'sarasaUiSC';
        }


        for (
            const [presetId, preset]
            of Object.entries(
                FONT_PRESETS
            )
        ) {

            if (
                presetId !== 'custom' &&
                preset.fontFamily ===
                    normalizedFont
            ) {
                return presetId;
            }
        }


        return normalizedFont
            ? 'custom'
            : 'wenkai';
    }


    const DEFAULT_SETTINGS = {

        enabled: true,

        siteFont:
            '"LXGW WenKai GB Screen", "LXGW WenKai Screen", serif',

        fontPreset:
            'wenkai',

        latinFontPreset:
            'follow',

        customWorkFont:
            '',

        customFontBold:
            false,

        workFont:
            FONT_PRESETS.wenkai.fontFamily,

        fontWeight:
            FONT_PRESETS.wenkai.fontWeight,

        fontSize:
            '115%',

        lineHeight:
            '1.7',

        maxWidth:
            '42em',

        letterSpacing:
            '0.02em',

        paragraphSpacing:
            '0.8em',

        enableIndent:
            true,

        cleanBreaks:
            true,

        spaceCjkEnglish:
            true,

        nextChapterLoadingMode:
            'none',

        justifyText:
            true,

        highContrast:
            true,

        hideNotes:
            false
    };


    function mergeStoredSettings(stored) {

        const merged = {
            ...DEFAULT_SETTINGS,
            ...(stored || {})
        };


        if (
            stored &&
            stored.nextChapterLoadingMode ===
                'prerender'
        ) {
            merged.nextChapterLoadingMode =
                'seamless';

        } else if (
            !NEXT_CHAPTER_LOADING_MODES.has(
                stored &&
                stored.nextChapterLoadingMode
            )
        ) {

            merged.nextChapterLoadingMode =
                stored &&
                stored.preloadNextChapter ===
                    true
                    ? 'prefetch'
                    : 'none';
        }


        const legacyFontPreset =
            stored &&
            stored.fontPreset;


        const storedFontPreset =
            LEGACY_FONT_PRESET_MAP[
                legacyFontPreset
            ] ||
            legacyFontPreset;


        const fontPreset =
            FONT_PRESET_IDS.has(
                storedFontPreset
            )
                ? storedFontPreset
                : inferFontPreset(
                    stored &&
                    stored.workFont
                );


        const customWorkFont =
            fontPreset === 'custom'
                ? String(
                    stored &&
                    (
                        stored.customWorkFont ||
                        stored.workFont
                    ) ||
                    ''
                ).trim()
                : String(
                    stored &&
                    stored.customWorkFont ||
                    ''
                ).trim();


        merged.fontPreset =
            fontPreset;


        const latinFontPreset =
            LATIN_FONT_PRESET_IDS.has(
                stored &&
                stored.latinFontPreset
            )
                ? stored.latinFontPreset
                : 'follow';


        merged.latinFontPreset =
            latinFontPreset;


        merged.customWorkFont =
            customWorkFont;


        const customFontBold =
            typeof (
                stored &&
                stored.customFontBold
            ) === 'boolean'
                ? stored.customFontBold
                : fontPreset === 'custom' &&
                    (
                        String(
                            stored &&
                            stored.fontWeight ||
                            ''
                        ) === '600' ||
                        String(
                            stored &&
                            stored.fontWeight ||
                            ''
                        ) === '700'
                    );


        merged.customFontBold =
            customFontBold;


        merged.workFont =
            getCombinedWorkFont(
                fontPreset,
                customWorkFont,
                latinFontPreset
            );


        merged.fontWeight =
            getPresetFontWeight(
                fontPreset,
                customFontBold
            );


        return merged;
    }


    // ============================================================
    // 3. Resilient settings storage
    // ============================================================

    /*
     * Settings are mirrored to GM Storage and AO3 localStorage. The
     * timestamp lets the newest valid copy win while localStorage keeps
     * settings persistent in browsers with incomplete GM_* support.
     */

    function normalizeStoredSettings(value) {

        if (!value) {
            return null;
        }


        // Some userscript managers / older versions may return JSON text.

        if (typeof value === 'string') {

            try {
                value =
                    JSON.parse(value);

            } catch (error) {
                return null;
            }
        }


        if (
            typeof value !== 'object' ||
            Array.isArray(value)
        ) {
            return null;
        }


        return value;
    }


    function getStorageRevision(settings) {

        const revision =
            Number(
                settings &&
                settings._storageUpdatedAt
            );


        return Number.isFinite(revision)
            ? revision
            : 0;
    }


    function readGmSettings() {

        if (
            typeof GM_getValue !==
            'function'
        ) {
            return null;
        }


        try {

            const value =
                GM_getValue(
                    SETTINGS_KEY,
                    null
                );


            /*
             * The legacy GM_getValue API is synchronous. Some partial
             * implementations return a Promise instead; the synchronous
             * settings flow uses localStorage in that case.
             */

            if (
                value &&
                typeof value.then ===
                    'function'
            ) {
                return null;
            }


            return normalizeStoredSettings(
                value
            );

        } catch (error) {

            console.warn(
                '[AO3 Site Wizard] Unable to read GM Storage:',
                error
            );

            return null;
        }
    }


    function readLocalSettings() {

        try {

            return normalizeStoredSettings(
                window.localStorage.getItem(
                    SETTINGS_KEY
                )
            );

        } catch (error) {

            console.warn(
                '[AO3 Site Wizard] Unable to read localStorage fallback:',
                error
            );

            return null;
        }
    }


    function writeGmSettings(settings) {

        if (
            typeof GM_setValue !==
            'function'
        ) {
            return;
        }


        try {

            const result =
                GM_setValue(
                    SETTINGS_KEY,
                    settings
                );


            if (
                result &&
                typeof result.catch ===
                    'function'
            ) {
                result.catch(
                    error => {

                        console.warn(
                            '[AO3 Site Wizard] Unable to write GM Storage:',
                            error
                        );
                    }
                );
            }

        } catch (error) {

            console.warn(
                '[AO3 Site Wizard] Unable to write GM Storage:',
                error
            );
        }
    }


    function writeLocalSettings(settings) {

        try {

            window.localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );

        } catch (error) {

            console.warn(
                '[AO3 Site Wizard] Unable to write localStorage fallback:',
                error
            );
        }
    }


    function getSettings() {

        const gmStored =
            readGmSettings();


        const localStored =
            readLocalSettings();


        // --------------------------------------------------------
        // Select the newest valid copy
        // --------------------------------------------------------

        let stored =
            null;


        if (
            gmStored &&
            localStored
        ) {

            stored =
                getStorageRevision(
                    localStored
                ) >
                getStorageRevision(
                    gmStored
                )
                    ? localStored
                    : gmStored;

        } else {

            stored =
                gmStored ||
                localStored;
        }


        if (stored) {

            /*
             * Seed or refresh the local fallback when GM Storage has the
             * newer copy. This only writes when the copies differ.
             */

            if (
                stored === gmStored &&
                (
                    !localStored ||
                    getStorageRevision(
                        gmStored
                    ) >
                    getStorageRevision(
                        localStored
                    )
                )
            ) {
                writeLocalSettings(
                    gmStored
                );
            }

            return mergeStoredSettings(
                stored
            );
        }


        return mergeStoredSettings(
            null
        );
    }


    function saveSettings(settings) {

        const stored = {
            ...settings,
            _storageUpdatedAt:
                Date.now()
        };


        writeGmSettings(stored);

        writeLocalSettings(stored);
    }


    // ============================================================
    // 4. Blank-content detection
    // ============================================================

    /*
     * Treat common invisible characters as whitespace:
     *
     * \u00A0   NBSP
     * \u1680   Ogham space
     * \u180E   Mongolian vowel separator
     * \u2000–200F various spaces / zero-width / direction marks
     * \u2028–2029 line / paragraph separator
     * \u202F   narrow NBSP
     * \u205F   medium mathematical space
     * \u2060   word joiner
     * \u3000   ideographic / full-width space
     * \uFEFF   BOM / zero-width no-break space
     */

    function isBlankText(text) {

        return String(text || '')
            .replace(
                /[\s\u00A0\u1680\u180E\u2000-\u200F\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]/g,
                ''
            )
            .trim() === '';
    }


    function isEmptyElement(element) {

        if (!element) {
            return true;
        }


        /*
         * Preserve elements containing meaningful non-text content.
         */

        if (
            element.querySelector(
                'img, iframe, video, audio, canvas, svg, object, embed'
            )
        ) {
            return false;
        }


        return isBlankText(
            element.textContent
        );
    }


    // ============================================================
    // 5. Extra blank-line cleanup
    // ============================================================

    function cleanExtraBreaks() {

        const settings =
            getSettings();


        if (
            !settings.enabled ||
            !settings.cleanBreaks
        ) {
            return;
        }


        /*
         * AO3 pages can contain multiple .userstuff containers.
         */

        const userstuffs =
            document.querySelectorAll(
                '#workskin .userstuff'
            );


        if (!userstuffs.length) {
            return;
        }


        userstuffs.forEach(
            userstuff => {


                // =================================================
                // A. ACE / rich-text pseudo blank lines
                // =================================================

                /*
                 * Example:
                 *
                 * <div class="ace-line longKeep gutter-noauthor">
                 *     <p>
                 *         <span class="author-xxx New Roman">
                 *             &nbsp;
                 *         </span>
                 *     </p>
                 * </div>
                 */

                userstuff
                    .querySelectorAll(
                        'div.ace-line'
                    )
                    .forEach(
                        div => {

                            if (
                                isEmptyElement(div)
                            ) {
                                div.remove();
                            }
                        }
                    );


                // =================================================
                // B. Empty inline wrappers
                // =================================================

                userstuff
                    .querySelectorAll(
                        'span, em, strong, b, i'
                    )
                    .forEach(
                        element => {

                            if (
                                isEmptyElement(element)
                            ) {
                                element.remove();
                            }
                        }
                    );


                // =================================================
                // C. Empty links
                // =================================================

                userstuff
                    .querySelectorAll('a')
                    .forEach(
                        element => {

                            if (
                                isEmptyElement(element)
                            ) {
                                element.remove();
                            }
                        }
                    );


                // =================================================
                // D. Empty paragraphs
                // =================================================

                userstuff
                    .querySelectorAll('p')
                    .forEach(
                        paragraph => {

                            if (
                                isEmptyElement(paragraph)
                            ) {
                                paragraph.remove();
                            }
                        }
                    );


                // =================================================
                // E. ACE lines that became empty after inner cleanup
                // =================================================

                userstuff
                    .querySelectorAll(
                        'div.ace-line'
                    )
                    .forEach(
                        div => {

                            if (
                                isEmptyElement(div)
                            ) {
                                div.remove();
                            }
                        }
                    );


                // =================================================
                // F. Generic empty divs
                // =================================================

                userstuff
                    .querySelectorAll('div')
                    .forEach(
                        div => {

                            if (
                                isEmptyElement(div)
                            ) {
                                div.remove();
                            }
                        }
                    );


                // =================================================
                // G. Consecutive BR cleanup
                // =================================================

                const brs =
                    Array.from(
                        userstuff.querySelectorAll(
                            'br'
                        )
                    );


                brs.forEach(
                    br => {

                        if (!br.isConnected) {
                            return;
                        }


                        let next =
                            br.nextSibling;


                        /*
                         * Ignore whitespace-only text nodes between BRs.
                         */

                        while (
                            next &&
                            next.nodeType === Node.TEXT_NODE &&
                            isBlankText(
                                next.nodeValue
                            )
                        ) {
                            next =
                                next.nextSibling;
                        }


                        /*
                         * <br>
                         * whitespace
                         * <br>
                         *
                         * becomes one BR.
                         */

                        if (
                            next &&
                            next.nodeType === Node.ELEMENT_NODE &&
                            next.tagName === 'BR'
                        ) {
                            br.remove();
                        }
                    }
                );


                // =================================================
                // H. Final fallback pass
                // =================================================

                userstuff
                    .querySelectorAll(
                        'p, div.ace-line'
                    )
                    .forEach(
                        element => {

                            if (
                                isEmptyElement(element)
                            ) {
                                element.remove();
                            }
                        }
                    );
            }
        );
    }


    // ============================================================
    // 6. BR-separated paragraph indentation
    // ============================================================

    const BR_PARAGRAPH_CLASS =
        'wiz-br-separated-paragraph';


    const BR_PARAGRAPH_LINE_CLASS =
        'wiz-br-separated-line';


    function hasDirectBreak(paragraph) {

        return Array.from(
            paragraph.childNodes
        ).some(
            node => (
                node.nodeType ===
                    Node.ELEMENT_NODE &&
                node.tagName ===
                    'BR'
            )
        );
    }


    function wrapBrSeparatedParagraph(paragraph) {

        if (
            paragraph.classList.contains(
                BR_PARAGRAPH_CLASS
            ) ||
            !hasDirectBreak(paragraph)
        ) {
            return;
        }


        const originalNodes =
            Array.from(
                paragraph.childNodes
            );


        const fragment =
            document.createDocumentFragment();


        let line =
            document.createElement(
                'span'
            );


        line.className =
            BR_PARAGRAPH_LINE_CLASS;


        originalNodes.forEach(
            node => {

                if (
                    node.nodeType ===
                        Node.ELEMENT_NODE &&
                    node.tagName ===
                        'BR'
                ) {
                    fragment.appendChild(
                        line
                    );


                    node.remove();


                    line =
                        document.createElement(
                            'span'
                        );


                    line.className =
                        BR_PARAGRAPH_LINE_CLASS;

                } else {

                    line.appendChild(
                        node
                    );
                }
            }
        );


        fragment.appendChild(
            line
        );


        paragraph.appendChild(
            fragment
        );


        paragraph.classList.add(
            BR_PARAGRAPH_CLASS
        );
    }


    function restoreBrSeparatedParagraph(paragraph) {

        const lines =
            Array.from(
                paragraph.children
            ).filter(
                child => (
                    child.classList.contains(
                        BR_PARAGRAPH_LINE_CLASS
                    )
                )
            );


        if (!lines.length) {
            paragraph.classList.remove(
                BR_PARAGRAPH_CLASS
            );

            return;
        }


        const fragment =
            document.createDocumentFragment();


        lines.forEach(
            (line, index) => {

                if (index > 0) {
                    fragment.appendChild(
                        document.createElement(
                            'br'
                        )
                    );
                }


                while (line.firstChild) {
                    fragment.appendChild(
                        line.firstChild
                    );
                }
            }
        );


        while (paragraph.firstChild) {
            paragraph.removeChild(
                paragraph.firstChild
            );
        }


        paragraph.appendChild(
            fragment
        );


        paragraph.classList.remove(
            BR_PARAGRAPH_CLASS
        );
    }


    function formatBrSeparatedParagraphs() {

        const settings =
            getSettings();


        const paragraphs =
            document.querySelectorAll(
                '#workskin .userstuff p'
            );


        if (
            !settings.enabled ||
            !settings.enableIndent
        ) {
            paragraphs.forEach(
                paragraph => {

                    if (
                        paragraph.classList.contains(
                            BR_PARAGRAPH_CLASS
                        )
                    ) {
                        restoreBrSeparatedParagraph(
                            paragraph
                        );
                    }
                }
            );

            return;
        }


        paragraphs.forEach(
            wrapBrSeparatedParagraph
        );
    }


    // ============================================================
    // 7. Chinese / English spacing
    // ============================================================

    const HAN_CHARACTER =
        /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;


    const ASCII_WORD_CHARACTER =
        /[A-Za-z0-9]/;


    const PUNCTUATION_BEFORE_ASCII_CHARACTER =
        /[、。，．！？；：…—～·“”（）【】《》「」『』〔〕〈〉〖〗〘〙〚〛｛｝［］",!?;:]/;


    const THIN_SPACE =
        '\u2009';


    const TEXT_FLOW_BOUNDARY_TAGS =
        new Set([
            'ADDRESS',
            'ARTICLE',
            'ASIDE',
            'BLOCKQUOTE',
            'BR',
            'DD',
            'DIV',
            'DL',
            'DT',
            'FIGCAPTION',
            'FIGURE',
            'FOOTER',
            'FORM',
            'H1',
            'H2',
            'H3',
            'H4',
            'H5',
            'H6',
            'HEADER',
            'HR',
            'LI',
            'MAIN',
            'NAV',
            'OL',
            'P',
            'SECTION',
            'TABLE',
            'TBODY',
            'TD',
            'TFOOT',
            'TH',
            'THEAD',
            'TR',
            'UL'
        ]);


    const SPACING_EXCLUDED_TAGS =
        new Set([
            'AUDIO',
            'BUTTON',
            'CANVAS',
            'CODE',
            'EMBED',
            'IFRAME',
            'IMG',
            'INPUT',
            'KBD',
            'MATH',
            'NOSCRIPT',
            'OBJECT',
            'OPTION',
            'PRE',
            'RUBY',
            'SAMP',
            'SCRIPT',
            'SELECT',
            'STYLE',
            'SVG',
            'TEMPLATE',
            'TEXTAREA',
            'VIDEO',
            'WBR'
        ]);


    function getCjkEnglishSpacing(left, right) {

        if (
            PUNCTUATION_BEFORE_ASCII_CHARACTER.test(left) &&
            ASCII_WORD_CHARACTER.test(right)
        ) {
            return THIN_SPACE;
        }


        if ((
            HAN_CHARACTER.test(left) &&
            ASCII_WORD_CHARACTER.test(right)
        ) || (
            ASCII_WORD_CHARACTER.test(left) &&
            HAN_CHARACTER.test(right)
        )) {
            return THIN_SPACE;
        }


        return '';
    }


    function addSpacingWithinText(text) {

        return text
            .replace(
                /([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])([A-Za-z0-9])/g,
                `$1${THIN_SPACE}$2`
            )
            .replace(
                /([A-Za-z0-9])([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/g,
                `$1${THIN_SPACE}$2`
            )
            .replace(
                /([、。，．！？；：…—～·“”（）【】《》「」『』〔〕〈〉〖〗〘〙〚〛｛｝［］",!?;:])([A-Za-z0-9])/g,
                `$1${THIN_SPACE}$2`
            );
    }


    function addSpacingToRoot(root) {

        let previousTextNode =
            null;


        function visit(node) {

            if (
                node.nodeType ===
                Node.TEXT_NODE
            ) {

                const originalText =
                    node.nodeValue || '';


                if (!originalText) {
                    return;
                }


                let spacedText =
                    addSpacingWithinText(
                        originalText
                    );


                const boundarySpacing =
                    previousTextNode
                        ? getCjkEnglishSpacing(
                        previousTextNode
                            .nodeValue
                            .slice(-1),
                        spacedText.charAt(0)
                    )
                        : '';


                if (boundarySpacing) {
                    spacedText =
                        `${boundarySpacing}${spacedText}`;
                }


                if (
                    spacedText !==
                    originalText
                ) {
                    node.nodeValue =
                        spacedText;
                }


                const lastCharacter =
                    spacedText.slice(-1);


                previousTextNode =
                    HAN_CHARACTER.test(
                        lastCharacter
                    ) ||
                    ASCII_WORD_CHARACTER.test(
                        lastCharacter
                    ) ||
                    PUNCTUATION_BEFORE_ASCII_CHARACTER.test(
                        lastCharacter
                    )
                        ? node
                        : null;


                return;
            }


            if (
                node.nodeType !==
                Node.ELEMENT_NODE
            ) {
                return;
            }


            const element =
                node;


            if (
                SPACING_EXCLUDED_TAGS.has(
                    element.tagName
                ) ||
                element.isContentEditable ||
                element.getAttribute(
                    'aria-hidden'
                ) === 'true'
            ) {
                previousTextNode =
                    null;

                return;
            }


            const isTextFlowBoundary =
                TEXT_FLOW_BOUNDARY_TAGS.has(
                    element.tagName
                ) ||
                element.classList.contains(
                    BR_PARAGRAPH_LINE_CLASS
                );


            if (isTextFlowBoundary) {
                previousTextNode =
                    null;
            }


            for (
                let child =
                    element.firstChild;
                child;
                child =
                    child.nextSibling
            ) {
                visit(child);
            }


            if (isTextFlowBoundary) {
                previousTextNode =
                    null;
            }
        }


        for (
            let child =
                root.firstChild;
            child;
            child =
                child.nextSibling
        ) {
            visit(child);
        }
    }


    function addCjkEnglishSpacing() {

        const settings =
            getSettings();


        if (
            !settings.enabled ||
            !settings.spaceCjkEnglish
        ) {
            return;
        }


        document
            .querySelectorAll(
                '#workskin .userstuff'
            )
            .forEach(
                addSpacingToRoot
            );
    }


    function processWorkContent() {

        cleanExtraBreaks();

        formatBrSeparatedParagraphs();

        addCjkEnglishSpacing();
    }


    // ============================================================
    // 8. Dynamic work-content observer
    // ============================================================

    let workObserver =
        null;

    let cleanTimer =
        null;


    function observeWorkContent() {

        const workskin =
            document.querySelector(
                '#workskin'
            );


        if (!workskin) {
            return;
        }


        if (workObserver) {

            workObserver.disconnect();
        }


        workObserver =
            new MutationObserver(
                () => {

                    clearTimeout(
                        cleanTimer
                    );


                    /*
                     * Debounce DOM cleanup to avoid excessive work while
                     * another script is inserting many nodes.
                     */

                    cleanTimer =
                        setTimeout(
                            processWorkContent,
                            120
                        );
                }
            );


        workObserver.observe(
            workskin,
            {
                childList: true,
                subtree: true
            }
        );
    }


    // ============================================================
    // 9. Next-chapter loading
    // ============================================================

    const NEXT_CHAPTER_PREFETCH_ID =
        'ao3-site-wizard-next-chapter-prefetch';


    const NEXT_CHAPTER_LINK_SELECTOR =
        '.work.navigation.actions li.chapter.next a[href]';


    const SEAMLESS_LOAD_SENTINEL_ID =
        'ao3-site-wizard-seamless-load-sentinel';


    let nextChapterLoadingScheduled =
        false;


    let seamlessNextChapterRequest =
        null;


    let seamlessAppendInProgress =
        false;


    let seamlessChapterObserver =
        null;


    let seamlessScrollFallbackBound =
        false;


    function clearNextChapterLoadingArtifacts() {

        const prefetch =
            document.getElementById(
                NEXT_CHAPTER_PREFETCH_ID
            );


        if (prefetch) {
            prefetch.remove();
        }
    }


    function getNextChapterUrl(
        root = document,
        baseUrl = window.location.href
    ) {

        const nextChapterLink =
            root.querySelector(
                NEXT_CHAPTER_LINK_SELECTOR
            );


        if (!nextChapterLink) {
            return null;
        }


        let nextChapterUrl;


        try {

            nextChapterUrl =
                new URL(
                    nextChapterLink.getAttribute(
                        'href'
                    ) || nextChapterLink.href,
                    baseUrl
                );

        } catch (error) {
            return null;
        }


        if (
            nextChapterUrl.origin !==
            window.location.origin
        ) {
            return null;
        }


        nextChapterUrl.hash =
            '';


        return nextChapterUrl;
    }


    function addNextChapterPrefetch(nextChapterUrl) {

        const prefetch =
            document.createElement(
                'link'
            );


        prefetch.id =
            NEXT_CHAPTER_PREFETCH_ID;


        prefetch.rel =
            'prefetch';


        prefetch.href =
            nextChapterUrl.href;


        (
            document.head ||
            document.documentElement
        ).appendChild(
            prefetch
        );
    }


    function clearSeamlessNextChapterRequest() {

        if (
            seamlessNextChapterRequest &&
            seamlessNextChapterRequest.controller
        ) {
            seamlessNextChapterRequest
                .controller
                .abort();
        }


        seamlessNextChapterRequest =
            null;
    }


    function prepareSeamlessNextChapter(
        nextChapterUrl
    ) {

        if (
            typeof window.fetch !==
            'function'
        ) {
            return false;
        }


        if (
            seamlessNextChapterRequest &&
            seamlessNextChapterRequest.url ===
                nextChapterUrl.href
        ) {
            return true;
        }


        clearSeamlessNextChapterRequest();


        const controller =
            typeof AbortController ===
                'function'
                ? new AbortController()
                : null;


        const request = {
            url: nextChapterUrl.href,
            controller,
            html: null,
            promise: null
        };


        seamlessNextChapterRequest =
            request;


        request.promise =
            window.fetch(
                request.url,
                {
                    cache: 'default',
                    credentials: 'same-origin',
                    redirect: 'follow',
                    ...(controller
                        ? {
                            signal:
                                controller.signal
                        }
                        : {})
                }
            )
                .then(
                    response => {

                        if (!response.ok) {
                            throw new Error(
                                `Next chapter request failed: ${response.status}`
                            );
                        }


                        return response.text();
                    }
                )
                .then(
                    html => {

                        if (
                            seamlessNextChapterRequest !==
                            request
                        ) {
                            return null;
                        }


                        request.html =
                            html;


                        return html;
                    }
                )
                .catch(
                    () => null
                );


        return true;
    }


    function getSeamlessLoadSentinel() {

        let sentinel =
            document.getElementById(
                SEAMLESS_LOAD_SENTINEL_ID
            );


        if (sentinel) {
            return sentinel;
        }


        const chapters =
            document.querySelector(
                '#chapters'
            );


        if (!chapters) {
            return null;
        }


        sentinel =
            document.createElement(
                'div'
            );


        sentinel.id =
            SEAMLESS_LOAD_SENTINEL_ID;


        sentinel.setAttribute(
            'role',
            'status'
        );


        sentinel.setAttribute(
            'aria-live',
            'polite'
        );


        chapters.appendChild(
            sentinel
        );


        return sentinel;
    }


    function setSeamlessLoadingState(
        sentinel,
        loading
    ) {

        sentinel.classList.toggle(
            'loading',
            loading
        );


        sentinel.textContent =
            loading
                ? '正在加载下一章…'
                : '';
    }


    function updateNextChapterLinks(
        nextChapterUrl
    ) {

        document.querySelectorAll(
            NEXT_CHAPTER_LINK_SELECTOR
        ).forEach(
            link => {

                if (nextChapterUrl) {
                    link.href =
                        nextChapterUrl.href;

                } else {

                    const item =
                        link.closest(
                            'li.chapter.next'
                        );


                    if (item) {
                        item.remove();
                    }
                }
            }
        );
    }


    function appendFinalWorkAfterword(
        nextDocument,
        chapters
    ) {

        const sourceAfterword =
            nextDocument.querySelector(
                '#workskin > .afterword.preface.group'
            );


        if (
            !sourceAfterword ||
            !chapters.parentNode
        ) {
            return;
        }


        const importedAfterword =
            document.importNode(
                sourceAfterword,
                true
            );


        importedAfterword.classList.add(
            'wiz-seamless-loaded-afterword'
        );


        chapters.parentNode.insertBefore(
            importedAfterword,
            chapters.nextSibling ||
                null
        );
    }


    function replacePostWorkRegion(
        nextDocument
    ) {

        const currentWork =
            document.querySelector(
                '#main .work'
            );


        const nextWork =
            nextDocument.querySelector(
                '#main .work'
            );


        if (
            !currentWork ||
            !nextWork ||
            !currentWork.parentNode ||
            !nextWork.parentNode
        ) {
            return;
        }


        const currentParent =
            currentWork.parentNode;


        let currentSibling =
            currentWork.nextSibling;


        while (currentSibling) {

            const followingSibling =
                currentSibling.nextSibling;


            currentSibling.remove();


            currentSibling =
                followingSibling;
        }


        let nextSibling =
            nextWork.nextSibling;


        while (nextSibling) {

            currentParent.appendChild(
                document.importNode(
                    nextSibling,
                    true
                )
            );


            nextSibling =
                nextSibling.nextSibling;
        }
    }


    function syncLatestChapterMetadata(
        nextDocument,
        chapterUrl,
        importedChapter
    ) {

        document.title =
            nextDocument.title;


        [
            'meta[name="csrf-param"]',
            'meta[name="csrf-token"]'
        ].forEach(
            selector => {

                const currentMeta =
                    document.querySelector(
                        selector
                    );


                const nextMeta =
                    nextDocument.querySelector(
                        selector
                    );


                if (
                    currentMeta &&
                    nextMeta
                ) {
                    currentMeta.setAttribute(
                        'content',
                        nextMeta.getAttribute(
                            'content'
                        ) || ''
                    );
                }
            }
        );


        const chapterAnchor =
            importedChapter.id ||
            'workskin';


        const latestChapterUrl =
            new URL(
                chapterUrl,
                window.location.href
            );


        latestChapterUrl.hash =
            chapterAnchor;


        const currentState =
            window.history.state;


        window.history.replaceState(
            {
                ...(
                    currentState &&
                    typeof currentState ===
                        'object'
                        ? currentState
                        : {}
                ),
                ao3SiteWizardLatestChapter:
                    true,
                ao3SiteWizardChapterAnchor:
                    chapterAnchor
            },
            '',
            latestChapterUrl.href
        );


        if (
            'scrollRestoration' in
            window.history
        ) {
            window.history.scrollRestoration =
                'manual';
        }
    }


    function configureSeamlessScrollRestoration() {

        if (
            !(
                'scrollRestoration' in
                window.history
            )
        ) {
            return;
        }


        const state =
            window.history.state;


        window.history.scrollRestoration =
            state &&
            state.ao3SiteWizardLatestChapter
                ? 'manual'
                : 'auto';
    }


    function restoreLatestChapterHeading() {

        const state =
            window.history.state;


        if (
            !state ||
            !state.ao3SiteWizardLatestChapter
        ) {
            return;
        }


        const chapterHeading =
            document.getElementById(
                state.ao3SiteWizardChapterAnchor ||
                'workskin'
            );


        if (chapterHeading) {
            chapterHeading.scrollIntoView({
                block: 'start'
            });
        }
    }


    function stopSeamlessChapterLoading() {

        clearSeamlessNextChapterRequest();


        if (seamlessChapterObserver) {
            seamlessChapterObserver.disconnect();

            seamlessChapterObserver =
                null;
        }


        const sentinel =
            document.getElementById(
                SEAMLESS_LOAD_SENTINEL_ID
            );


        if (sentinel) {
            sentinel.remove();
        }


        seamlessAppendInProgress =
            false;
    }


    function isSeamlessSentinelNearViewport() {

        const sentinel =
            document.getElementById(
                SEAMLESS_LOAD_SENTINEL_ID
            );


        return Boolean(
            sentinel &&
            sentinel.getBoundingClientRect()
                .top <=
                window.innerHeight + 1000
        );
    }


    function scheduleNearbySeamlessAppend() {

        window.setTimeout(
            () => {

                if (
                    getSettings()
                        .nextChapterLoadingMode ===
                        'seamless' &&
                    isSeamlessSentinelNearViewport()
                ) {
                    appendSeamlessNextChapter();
                }
            },
            0
        );
    }


    async function appendSeamlessNextChapter() {

        if (seamlessAppendInProgress) {
            return;
        }


        const request =
            seamlessNextChapterRequest;


        const sentinel =
            document.getElementById(
                SEAMLESS_LOAD_SENTINEL_ID
            );


        if (
            !request ||
            !sentinel
        ) {
            return;
        }


        seamlessAppendInProgress =
            true;


        setSeamlessLoadingState(
            sentinel,
            true
        );


        const html =
            request.html ||
            await request.promise;


        if (
            !html ||
            seamlessNextChapterRequest !==
                request
        ) {
            seamlessAppendInProgress =
                false;


            if (
                seamlessNextChapterRequest ===
                request
            ) {
                stopSeamlessChapterLoading();
            }


            return;
        }


        let nextDocument;


        try {

            nextDocument =
                new DOMParser()
                    .parseFromString(
                        html,
                        'text/html'
                    );

        } catch (error) {
            nextDocument =
                null;
        }


        const sourceChapter =
            nextDocument &&
            nextDocument.querySelector(
                '#chapters > .chapter'
            );


        const chapters =
            document.querySelector(
                '#chapters'
            );


        if (
            !sourceChapter ||
            !chapters ||
            !sentinel.parentNode
        ) {
            seamlessAppendInProgress =
                false;

            stopSeamlessChapterLoading();

            return;
        }


        const importedChapter =
            document.importNode(
                sourceChapter,
                true
            );


        importedChapter.classList.add(
            'wiz-seamless-loaded-chapter'
        );


        chapters.insertBefore(
            importedChapter,
            sentinel
        );


        replacePostWorkRegion(
            nextDocument
        );


        syncLatestChapterMetadata(
            nextDocument,
            request.url,
            importedChapter
        );


        const followingChapterUrl =
            getNextChapterUrl(
                nextDocument,
                request.url
            );


        seamlessNextChapterRequest =
            null;


        seamlessAppendInProgress =
            false;


        setSeamlessLoadingState(
            sentinel,
            false
        );


        updateNextChapterLinks(
            followingChapterUrl
        );


        processWorkContent();


        if (followingChapterUrl) {
            prepareSeamlessNextChapter(
                followingChapterUrl
            );

            scheduleNearbySeamlessAppend();

        } else {

            appendFinalWorkAfterword(
                nextDocument,
                chapters
            );

            if (seamlessChapterObserver) {
                seamlessChapterObserver.disconnect();

                seamlessChapterObserver =
                    null;
            }


            sentinel.remove();
        }
    }


    function observeSeamlessChapterBoundary() {

        const sentinel =
            getSeamlessLoadSentinel();


        if (!sentinel) {
            return;
        }


        if (
            typeof IntersectionObserver ===
            'function'
        ) {

            if (seamlessChapterObserver) {
                seamlessChapterObserver.disconnect();
            }


            seamlessChapterObserver =
                new IntersectionObserver(
                    entries => {

                        if (
                            entries.some(
                                entry =>
                                    entry.isIntersecting
                            )
                        ) {
                            appendSeamlessNextChapter();
                        }
                    },
                    {
                        rootMargin:
                            '1000px 0px'
                    }
                );


            seamlessChapterObserver.observe(
                sentinel
            );

        } else if (
            !seamlessScrollFallbackBound
        ) {

            seamlessScrollFallbackBound =
                true;


            window.addEventListener(
                'scroll',
                () => {

                    if (
                        getSettings()
                            .nextChapterLoadingMode ===
                            'seamless' &&
                        isSeamlessSentinelNearViewport()
                    ) {
                        appendSeamlessNextChapter();
                    }
                },
                {
                    passive: true
                }
            );
        }


        scheduleNearbySeamlessAppend();
    }


    function configureNextChapterLoading() {

        clearNextChapterLoadingArtifacts();


        const settings =
            getSettings();


        if (
            settings.nextChapterLoadingMode ===
                'none'
        ) {
            stopSeamlessChapterLoading();

            return;
        }


        const nextChapterUrl =
            getNextChapterUrl();


        if (!nextChapterUrl) {
            stopSeamlessChapterLoading();

            return;
        }


        if (
            settings.nextChapterLoadingMode ===
                'seamless'
        ) {
            if (
                !prepareSeamlessNextChapter(
                    nextChapterUrl
                )
            ) {
                addNextChapterPrefetch(
                    nextChapterUrl
                );

            } else {

                observeSeamlessChapterBoundary();
            }


            return;
        }


        stopSeamlessChapterLoading();


        addNextChapterPrefetch(
            nextChapterUrl
        );
    }


    function scheduleNextChapterPreload() {

        clearNextChapterLoadingArtifacts();


        if (nextChapterLoadingScheduled) {
            return;
        }


        nextChapterLoadingScheduled =
            true;


        const scheduleWhenIdle =
            () => {

                const run =
                    () => {

                        nextChapterLoadingScheduled =
                            false;


                        configureNextChapterLoading();
                    };


                if (
                    typeof window.requestIdleCallback ===
                    'function'
                ) {
                    window.requestIdleCallback(
                        run,
                        {
                            timeout: 1500
                        }
                    );

                } else {

                    window.setTimeout(
                        run,
                        600
                    );
                }
            };


        if (
            document.readyState ===
            'complete'
        ) {
            scheduleWhenIdle();

        } else {

            window.addEventListener(
                'load',
                scheduleWhenIdle,
                {
                    once: true
                }
            );
        }
    }


    // ============================================================
    // 10. Low-frequency update check
    // ============================================================

    const SCRIPT_VERSION =
        (() => {

            try {

                if (
                    typeof GM_info ===
                        'object' &&
                    GM_info &&
                    GM_info.script &&
                    GM_info.script.version
                ) {
                    return String(
                        GM_info.script.version
                    );
                }

            } catch (error) {
                // Some minimal userscript engines do not expose GM_info.
            }


            return '';
        })();


    const UPDATE_CHECK_URL =
        'https://api.greasyfork.org/scripts/593728.json';


    const UPDATE_PAGE_URL =
        'https://greasyfork.org/zh-CN/scripts/593728';


    const UPDATE_CHECK_STATE_KEY =
        'ao3_site_wizard_update_check';


    const UPDATE_NOTICE_ID =
        'ao3-site-wizard-update-notice';


    const UPDATE_LINK_ID =
        'wiz-version-update';


    const UPDATE_CHECK_INTERVAL =
        7 * 24 * 60 * 60 * 1000;


    let updateCheckScheduled =
        false;


    function readUpdateCheckState() {

        try {

            return normalizeStoredSettings(
                window.localStorage.getItem(
                    UPDATE_CHECK_STATE_KEY
                )
            ) || {};

        } catch (error) {
            return {};
        }
    }


    function writeUpdateCheckState(state) {

        try {

            window.localStorage.setItem(
                UPDATE_CHECK_STATE_KEY,
                JSON.stringify(state)
            );

        } catch (error) {
            // Update checks are optional; storage failures stay silent.
        }
    }


    function compareVersions(left, right) {

        const leftParts =
            String(left)
                .match(/\d+/g) || [];


        const rightParts =
            String(right)
                .match(/\d+/g) || [];


        const length =
            Math.max(
                leftParts.length,
                rightParts.length
            );


        for (
            let index = 0;
            index < length;
            index += 1
        ) {

            const difference =
                Number(leftParts[index] || 0) -
                Number(rightParts[index] || 0);


            if (difference !== 0) {
                return difference;
            }
        }


        return 0;
    }


    function updatePanelVersionIndicator(latestVersion) {

        const updateLink =
            document.getElementById(
                UPDATE_LINK_ID
            );


        if (!updateLink) {
            return;
        }


        const version =
            String(latestVersion || '');


        const updateAvailable =
            SCRIPT_VERSION &&
            version &&
            compareVersions(
                version,
                SCRIPT_VERSION
            ) > 0;


        updateLink.hidden =
            !updateAvailable;


        if (!updateAvailable) {
            updateLink.textContent = '';
            updateLink.removeAttribute('title');
            updateLink.removeAttribute('aria-label');
            return;
        }


        updateLink.textContent =
            `↑ v${version}`;


        updateLink.title =
            `有新版本 v${version}，点击查看更新`;


        updateLink.setAttribute(
            'aria-label',
            updateLink.title
        );
    }


    function requestUpdateInfoWithFetch() {

        if (
            typeof window.fetch !==
            'function'
        ) {
            return Promise.reject(
                new Error('Fetch unavailable')
            );
        }


        return window.fetch(
            UPDATE_CHECK_URL,
            {
                cache: 'no-store',
                credentials: 'omit',
                mode: 'cors'
            }
        ).then(
            response => {

                if (!response.ok) {
                    throw new Error(
                        `Update check failed: ${response.status}`
                    );
                }


                return response.json();
            }
        );
    }


    function requestUpdateInfoWithGm() {

        return new Promise(
            (resolve, reject) => {

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: UPDATE_CHECK_URL,
                    timeout: 10000,
                    onload: response => {

                        if (
                            response.status < 200 ||
                            response.status >= 300
                        ) {
                            reject(
                                new Error(
                                    `Update check failed: ${response.status}`
                                )
                            );

                            return;
                        }


                        try {

                            resolve(
                                JSON.parse(
                                    response.responseText
                                )
                            );

                        } catch (error) {
                            reject(error);
                        }
                    },
                    onerror: reject,
                    ontimeout: reject
                });
            }
        );
    }


    function requestUpdateInfo() {

        if (
            typeof GM_xmlhttpRequest ===
            'function'
        ) {
            return requestUpdateInfoWithGm()
                .catch(
                    requestUpdateInfoWithFetch
                );
        }


        return requestUpdateInfoWithFetch();
    }


    function showUpdateNotice(latestVersion) {

        if (
            !document.body ||
            document.getElementById(
                UPDATE_NOTICE_ID
            )
        ) {
            return;
        }


        const notice =
            document.createElement(
                'aside'
            );


        notice.id =
            UPDATE_NOTICE_ID;


        notice.setAttribute(
            'role',
            'status'
        );


        notice.setAttribute(
            'aria-live',
            'polite'
        );


        const message =
            document.createElement(
                'span'
            );


        message.className =
            'wiz-update-message';


        message.append(
            'Site Wizard 有新版本 ',
            Object.assign(
                document.createElement(
                    'strong'
                ),
                {
                    textContent:
                        `v${latestVersion}`
                }
            )
        );


        const actions =
            document.createElement(
                'span'
            );


        actions.className =
            'wiz-update-actions';


        const updateLink =
            document.createElement(
                'a'
            );


        updateLink.href =
            UPDATE_PAGE_URL;


        updateLink.target =
            '_blank';


        updateLink.rel =
            'noopener noreferrer';


        updateLink.textContent =
            '查看更新';


        const dismissButton =
            document.createElement(
                'button'
            );


        dismissButton.type =
            'button';


        dismissButton.className =
            'wiz-update-dismiss';


        dismissButton.setAttribute(
            'aria-label',
            '关闭更新提示'
        );


        dismissButton.title =
            '关闭';


        dismissButton.textContent =
            '✕';


        dismissButton.addEventListener(
            'click',
            () => {

                writeUpdateCheckState({
                    ...readUpdateCheckState(),
                    dismissedVersion:
                        latestVersion
                });


                notice.remove();
            }
        );


        actions.append(
            updateLink,
            dismissButton
        );


        notice.append(
            message,
            actions
        );


        document.body.appendChild(
            notice
        );
    }


    function displayAvailableUpdate(state) {

        const latestVersion =
            String(
                state.latestVersion ||
                ''
            );


        const updateAvailable =
            SCRIPT_VERSION &&
            latestVersion &&
            compareVersions(
                latestVersion,
                SCRIPT_VERSION
            ) > 0;


        updatePanelVersionIndicator(
            updateAvailable
                ? latestVersion
                : ''
        );


        if (
            updateAvailable &&
            state.dismissedVersion !==
                latestVersion
        ) {
            showUpdateNotice(
                latestVersion
            );
        }
    }


    function checkForScriptUpdate() {

        const state =
            readUpdateCheckState();


        displayAvailableUpdate(
            state
        );


        const now =
            Date.now();


        if (
            now -
            Number(state.lastCheckedAt || 0) <
            UPDATE_CHECK_INTERVAL
        ) {
            return;
        }


        writeUpdateCheckState({
            ...state,
            lastCheckedAt: now
        });


        requestUpdateInfo()
            .then(
                info => {

                    const latestVersion =
                        String(
                            info &&
                            info.version ||
                            ''
                        );


                    if (!latestVersion) {
                        return;
                    }


                    const updatedState = {
                        ...readUpdateCheckState(),
                        lastCheckedAt: now,
                        latestVersion
                    };


                    writeUpdateCheckState(
                        updatedState
                    );


                    displayAvailableUpdate(
                        updatedState
                    );
                }
            )
            .catch(
                () => {
                    // A failed optional check must not disturb reading.
                }
            );
    }


    function scheduleUpdateCheck() {

        if (updateCheckScheduled) {
            return;
        }


        updateCheckScheduled =
            true;


        const run =
            () => {

                if (
                    typeof window.requestIdleCallback ===
                    'function'
                ) {
                    window.requestIdleCallback(
                        checkForScriptUpdate,
                        {
                            timeout: 4000
                        }
                    );

                } else {

                    window.setTimeout(
                        checkForScriptUpdate,
                        2000
                    );
                }
            };


        if (
            document.readyState ===
            'complete'
        ) {
            run();

        } else {

            window.addEventListener(
                'load',
                run,
                {
                    once: true
                }
            );
        }
    }


    // ============================================================
    // 11. Reading styles
    // ============================================================

    function ensurePresetFontLoaded(
        fontPreset,
        presets = FONT_PRESETS,
        namespace = 'font'
    ) {

        const preset =
            presets[fontPreset];


        if (!preset) {
            return;
        }


        const cssUrls =
            preset.cssUrls ||
            (
                preset.cssUrl
                    ? [preset.cssUrl]
                    : []
            );


        cssUrls.forEach(
            (cssUrl, index) => {

                const elementId =
                    `ao3-site-wizard-${namespace}-${fontPreset}-${index}`;


                if (
                    document.getElementById(
                        elementId
                    )
                ) {
                    return;
                }


                const fontElement =
                    document.createElement(
                        'link'
                    );


                fontElement.id =
                    elementId;


                fontElement.rel =
                    'stylesheet';


                fontElement.href =
                    cssUrl;


                fontElement.crossOrigin =
                    'anonymous';


                (
                    document.head ||
                    document.documentElement
                ).appendChild(
                    fontElement
                );
            }
        );


        if (preset.fontFaceCss) {

            const styleId =
                `ao3-site-wizard-${namespace}-${fontPreset}-face`;


            if (
                !document.getElementById(
                    styleId
                )
            ) {

                const styleElement =
                    document.createElement(
                        'style'
                    );


                styleElement.id =
                    styleId;


                styleElement.textContent =
                    preset.fontFaceCss;


                (
                    document.head ||
                    document.documentElement
                ).appendChild(
                    styleElement
                );
            }
        }
    }


    function applyStyles() {

        const settings =
            getSettings();


        const styleId =
            'ao3-site-wizard-custom-style';


        let styleElement =
            document.getElementById(
                styleId
            );


        if (!styleElement) {

            styleElement =
                document.createElement(
                    'style'
                );

            styleElement.id =
                styleId;


            (
                document.head ||
                document.documentElement
            ).appendChild(
                styleElement
            );
        }


        // --------------------------------------------------------
        // Master switch
        // --------------------------------------------------------

        if (!settings.enabled) {

            styleElement.textContent =
                '';

            processWorkContent();

            return;
        }


        ensurePresetFontLoaded(
            settings.fontPreset
        );


        ensurePresetFontLoaded(
            settings.latinFontPreset,
            LATIN_FONT_PRESETS,
            'latin-font'
        );


        styleElement.textContent = `

            /* ====================================================
               Site-wide font
               ==================================================== */

            ${settings.siteFont ? `

            body,
            body *:not(code):not(pre):not(.icon) {

                font-family:
                    ${settings.siteFont}
                    !important;
            }

            ` : ''}


            /* ====================================================
               Work typography
               ==================================================== */

            #workskin,
            #workskin .userstuff,
            #workskin .userstuff
            *:not(code):not(pre):not(.icon) {

                ${settings.workFont ? `

                font-family:
                    ${settings.workFont}
                    !important;

                ` : ''}
            }


            #workskin,
            #workskin .userstuff,
            #workskin .userstuff p,
            #workskin .userstuff blockquote {


                ${settings.fontWeight ? `

                font-weight:
                    ${settings.fontWeight}
                    !important;

                ` : ''}


                ${settings.fontSize ? `

                font-size:
                    ${settings.fontSize}
                    !important;

                ` : ''}


                ${settings.lineHeight ? `

                line-height:
                    ${settings.lineHeight}
                    !important;

                ` : ''}
            }


            /* ====================================================
               Paragraph formatting
               ==================================================== */

            #workskin .userstuff p {

                ${settings.letterSpacing ? `

                letter-spacing:
                    ${settings.letterSpacing}
                    !important;

                ` : ''}


                ${settings.paragraphSpacing ? `

                margin-bottom:
                    ${settings.paragraphSpacing}
                    !important;

                ` : ''}


                text-indent:
                    ${settings.enableIndent
                        ? '2em'
                        : '0em'}
                    !important;


                ${settings.justifyText ? `

                text-align:
                    justify
                    !important;

                ` : ''}
            }


            #workskin .userstuff
            p.${BR_PARAGRAPH_CLASS} {

                text-indent:
                    0
                    !important;
            }


            #workskin .userstuff
            p.${BR_PARAGRAPH_CLASS}
            > span.${BR_PARAGRAPH_LINE_CLASS} {

                display:
                    block;

                min-height:
                    1em;

                text-indent:
                    2em
                    !important;
            }


            ${settings.paragraphSpacing ? `

            #workskin .userstuff
            p.${BR_PARAGRAPH_CLASS}
            > span.${BR_PARAGRAPH_LINE_CLASS}:not(:last-child) {

                margin-bottom:
                    ${settings.paragraphSpacing}
                    !important;
            }

            ` : ''}


            /* ====================================================
               Work width
               ==================================================== */

            #workskin .userstuff {

                ${settings.maxWidth ? `

                max-width:
                    ${settings.maxWidth}
                    !important;

                ` : ''}


                margin-left:
                    auto
                    !important;

                margin-right:
                    auto
                    !important;
            }


            /* ====================================================
               High contrast
               ==================================================== */

            ${settings.highContrast ? `

            body,
            #outer,
            #inner,
            #workskin,
            #workskin .userstuff,
            #workskin .userstuff * {

                color:
                    #000000
                    !important;

                background-color:
                    #ffffff
                    !important;
            }

            ` : ''}


            /* ====================================================
               Hide Notes
               ==================================================== */

            ${settings.hideNotes ? `

            #workskin .notes,
            #workskin .end.notes {

                display:
                    none
                    !important;
            }

            ` : ''}
        `;


        processWorkContent();
    }


    // ============================================================
    // 12. Compact settings-panel CSS
    // ============================================================

    const WIZARD_LAUNCHER_ID =
        'ao3-wizard-launcher';


    const WIZARD_UI_STATE_KEY =
        'ao3_site_wizard_ui_state';


    function injectWizardStyles() {

        if (
            document.getElementById(
                'ao3-site-wizard-ui-style'
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                'style'
            );


        style.id =
            'ao3-site-wizard-ui-style';


        style.textContent = `

            /* ====================================================
               Panel
               ==================================================== */

            #ao3-wizard-ui {

                position:
                    fixed;

                top:
                    8vh;

                right:
                    16px;

                z-index:
                    999999;

                width:
                    min(
                        320px,
                        calc(100vw - 20px)
                    );

                max-height:
                    88vh;

                overflow-y:
                    auto;

                -webkit-overflow-scrolling:
                    touch;

                box-sizing:
                    border-box;

                padding:
                    12px 14px;

                background:
                    #ffffff;

                color:
                    #333333;

                border:
                    2px solid #990000;

                border-radius:
                    8px;

                box-shadow:
                    0 3px 12px
                    rgba(0, 0, 0, 0.22);

                font-size:
                    13.5px;

                line-height:
                    1.3;

                display:
                    none;

                font-family:
                    Arial,
                    sans-serif
                    !important;
            }


            #ao3-wizard-ui *,
            #ao3-wizard-ui *::before,
            #ao3-wizard-ui *::after {

                box-sizing:
                    border-box;

                font-family:
                    Arial,
                    sans-serif
                    !important;
            }


            /* ====================================================
               Header
               ==================================================== */

            #ao3-wizard-ui .wiz-header {

                display:
                    flex;

                justify-content:
                    space-between;

                align-items:
                    center;

                min-height:
                    34px;

                margin-bottom:
                    6px;

                padding-bottom:
                    5px;

                border-bottom:
                    1px solid #dddddd;
            }


            #ao3-wizard-ui .wiz-title {

                margin:
                    0;

                padding:
                    0;

                color:
                    #990000;

                font-size:
                    15px;

                line-height:
                    1.2;

                font-weight:
                    700;
            }


            #ao3-wizard-ui .wiz-title-group {

                display:
                    flex;

                align-items:
                    baseline;

                flex:
                    1 1 auto;

                flex-wrap:
                    wrap;

                min-width:
                    0;

                column-gap:
                    6px;

                row-gap:
                    1px;
            }


            #ao3-wizard-ui .wiz-current-version {

                color:
                    #777777;

                font-size:
                    10.5px;

                font-weight:
                    400;

                line-height:
                    1.2;

                white-space:
                    nowrap;
            }


            #ao3-wizard-ui .wiz-version-update {

                color:
                    #990000;

                font-size:
                    11px;

                font-weight:
                    700;

                line-height:
                    1.2;

                text-decoration:
                    none;

                white-space:
                    nowrap;
            }


            #ao3-wizard-ui .wiz-version-update:hover,
            #ao3-wizard-ui .wiz-version-update:focus {

                text-decoration:
                    underline;
            }


            #ao3-wizard-ui .wiz-version-update[hidden] {

                display:
                    none !important;
            }


            /* ====================================================
               Header controls
               ==================================================== */

            #ao3-wizard-ui .wiz-header-actions {

                display:
                    flex;

                align-items:
                    center;

                flex:
                    0 0 auto;

                margin:
                    -3px -3px -3px 6px;
            }

            #ao3-wizard-ui .wiz-header-button {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                flex:
                    0 0 34px;

                width:
                    34px;

                height:
                    34px;

                min-width:
                    34px;

                min-height:
                    34px;

                margin:
                    0;

                padding:
                    0;

                -webkit-appearance:
                    none !important;

                appearance:
                    none !important;

                border:
                    0 !important;

                border-radius:
                    5px;

                box-shadow:
                    none !important;

                text-shadow:
                    none !important;

                background:
                    transparent;

                color:
                    #666666;

                font-size:
                    19px;

                line-height:
                    1;

                font-weight:
                    bold;

                cursor:
                    pointer;

                touch-action:
                    manipulation;

                -webkit-tap-highlight-color:
                    transparent;
            }


            #ao3-wizard-ui .wiz-minimize-button::before {

                content:
                    '';

                display:
                    block;

                width:
                    14px;

                height:
                    2px;

                background:
                    currentColor;
            }


            #ao3-wizard-ui .wiz-header-button:hover,
            #ao3-wizard-ui .wiz-header-button:focus,
            #ao3-wizard-ui .wiz-header-button:active {

                border:
                    0 !important;

                box-shadow:
                    none !important;

                background:
                    #eeeeee;

                color:
                    #111111;
            }


            /* ====================================================
               Minimized launcher
               ==================================================== */

            #${WIZARD_LAUNCHER_ID} {

                position:
                    fixed;

                right:
                    12px;

                right:
                    max(
                        12px,
                        env(safe-area-inset-right)
                    );

                bottom:
                    12px;

                bottom:
                    max(
                        12px,
                        env(safe-area-inset-bottom)
                    );

                z-index:
                    999999;

                display:
                    none;

                align-items:
                    center;

                justify-content:
                    center;

                width:
                    38px;

                height:
                    38px;

                min-width:
                    38px;

                min-height:
                    38px;

                margin:
                    0;

                padding:
                    0;

                -webkit-appearance:
                    none !important;

                appearance:
                    none !important;

                border:
                    1px solid #990000 !important;

                border-radius:
                    50%;

                box-shadow:
                    none !important;

                text-shadow:
                    none !important;

                background:
                    #ffffff;

                color:
                    #990000;

                font-family:
                    Arial,
                    sans-serif
                    !important;

                font-size:
                    13px;

                line-height:
                    1;

                font-weight:
                    700;

                letter-spacing:
                    0;

                cursor:
                    pointer;

                touch-action:
                    manipulation;

                -webkit-tap-highlight-color:
                    transparent;
            }


            #${WIZARD_LAUNCHER_ID}:hover,
            #${WIZARD_LAUNCHER_ID}:focus,
            #${WIZARD_LAUNCHER_ID}:active {

                border-color:
                    #770000 !important;

                box-shadow:
                    none !important;

                background:
                    #990000;

                color:
                    #ffffff;
            }


            /* ====================================================
               Dividers
               ==================================================== */

            #ao3-wizard-ui .wiz-divider {

                border:
                    none;

                border-top:
                    1px dashed #cccccc;

                margin:
                    6px 0;
            }


            /* ====================================================
               Input fields
               ==================================================== */

            #ao3-wizard-ui .wiz-field {

                display:
                    block;

                min-width:
                    0;

                margin-bottom:
                    7px;

                font-size:
                    12.5px;

                font-weight:
                    600;

                color:
                    #333333;
            }


            #ao3-wizard-ui input[type="text"],
            #ao3-wizard-ui select {

                display:
                    block;

                width:
                    100%;

                min-width:
                    0;

                max-width:
                    100%;

                height:
                    34px;

                min-height:
                    34px;

                margin-top:
                    3px;

                padding:
                    5px 7px;

                border:
                    1px solid #aaaaaa;

                border-radius:
                    4px;

                background:
                    #ffffff;

                color:
                    #222222;

                font-size:
                    14px;

                line-height:
                    1.2;
            }


            #ao3-wizard-ui input[type="text"]:focus,
            #ao3-wizard-ui select:focus {

                outline:
                    1px solid #990000;

                outline-offset:
                    0;

                border-color:
                    #990000;
            }


            #ao3-wizard-ui .wiz-custom-font-field[hidden] {

                display:
                    none !important;
            }


            #ao3-wizard-ui .wiz-custom-weight-toggle {

                margin-top:
                    5px;
            }


            /* ====================================================
               Two-column fields
               ==================================================== */

            #ao3-wizard-ui .wiz-field-row {

                display:
                    grid;

                grid-template-columns:
                    minmax(0, 1fr) minmax(0, 1fr);

                width:
                    100%;

                min-width:
                    0;

                gap:
                    8px;
            }


            #ao3-wizard-ui .wiz-font-row select {

                padding-left:
                    5px;

                padding-right:
                    4px;

                font-size:
                    12.5px;
            }


            /* ====================================================
               Toggle rows
               ==================================================== */

            #ao3-wizard-ui .wiz-toggle-row {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    9px;

                width:
                    100%;

                min-height:
                    34px;

                margin:
                    0;

                padding:
                    3px 2px;

                border-radius:
                    4px;

                cursor:
                    pointer;

                user-select:
                    none;

                -webkit-user-select:
                    none;

                -webkit-tap-highlight-color:
                    transparent;
            }


            #ao3-wizard-ui .wiz-toggle-row:hover {

                background:
                    #f5f5f5;
            }


            #ao3-wizard-ui
            .wiz-toggle-row
            input[type="checkbox"] {

                -webkit-appearance:
                    none !important;

                appearance:
                    none !important;

                position:
                    static !important;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                flex:
                    0 0 20px;

                width:
                    20px;

                height:
                    20px;

                min-width:
                    20px;

                min-height:
                    20px;

                margin:
                    0 !important;

                padding:
                    0 !important;

                border:
                    1px solid #777777 !important;

                border-radius:
                    50%;

                background:
                    #ffffff !important;

                box-shadow:
                    none !important;

                transform:
                    none !important;

                vertical-align:
                    middle;

                cursor:
                    pointer;

                opacity:
                    1;

                transition:
                    none;

                accent-color:
                    auto;
            }


            #ao3-wizard-ui
            .wiz-toggle-row
            input[type="checkbox"]::before {

                content:
                    "";

                width:
                    5px;

                height:
                    9px;

                border-right:
                    2px solid #ffffff;

                border-bottom:
                    2px solid #ffffff;

                opacity:
                    0;

                transform:
                    translateY(-1px)
                    rotate(45deg);
            }


            #ao3-wizard-ui
            .wiz-toggle-row
            input[type="checkbox"]:checked {

                border-color:
                    #990000 !important;

                background:
                    #990000 !important;
            }


            #ao3-wizard-ui
            .wiz-toggle-row
            input[type="checkbox"]:checked::before {

                opacity:
                    1;
            }


            #ao3-wizard-ui
            .wiz-toggle-row
            input[type="checkbox"]:focus-visible {

                outline:
                    2px solid #990000;

                outline-offset:
                    2px;
            }


            #ao3-wizard-ui .wiz-toggle-label {

                flex:
                    1;

                font-size:
                    13.5px;

                line-height:
                    1.25;

                cursor:
                    pointer;
            }


            /* ====================================================
               Save button
               ==================================================== */

            #ao3-wizard-ui .wiz-save-area {

                display:
                    flex;

                justify-content:
                    flex-end;

                margin-top:
                    8px;
            }


            #ao3-wizard-ui .wiz-save-button {

                min-height:
                    38px;

                padding:
                    6px 14px;

                border:
                    1px solid #990000;

                border-radius:
                    5px;

                background:
                    #990000;

                color:
                    #ffffff;

                font-size:
                    13.5px;

                line-height:
                    1.2;

                font-weight:
                    700;

                cursor:
                    pointer;

                touch-action:
                    manipulation;

                -webkit-tap-highlight-color:
                    transparent;
            }


            #ao3-wizard-ui .wiz-save-button:hover,
            #ao3-wizard-ui .wiz-save-button:focus {

                background:
                    #770000;
            }


            #ao3-wizard-ui .wiz-save-button.saved {

                background:
                    #ffffff;

                color:
                    #333333;

                border-color:
                    #777777;
            }


            /* ====================================================
               Seamless chapter loading status
               ==================================================== */

            #${SEAMLESS_LOAD_SENTINEL_ID} {

                width:
                    100%;

                min-height:
                    1px;

                margin:
                    0;

                padding:
                    0;

                color:
                    #555555;

                font-size:
                    13px;

                line-height:
                    1.4;

                text-align:
                    center;
            }


            #${SEAMLESS_LOAD_SENTINEL_ID}.loading {

                min-height:
                    40px;

                margin-top:
                    16px;

                padding:
                    10px 4px;

                border-top:
                    1px solid #cccccc;
            }


            /* ====================================================
               Update notice
               ==================================================== */

            #${UPDATE_NOTICE_ID} {

                position:
                    fixed;

                left:
                    50%;

                bottom:
                    12px;

                bottom:
                    max(
                        12px,
                        env(safe-area-inset-bottom)
                    );

                z-index:
                    1000000;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    12px;

                width:
                    min(
                        520px,
                        calc(100vw - 24px)
                    );

                min-height:
                    48px;

                padding:
                    8px 10px 8px 12px;

                transform:
                    translateX(-50%);

                border:
                    2px solid #990000;

                border-radius:
                    6px;

                box-shadow:
                    0 3px 12px
                    rgba(0, 0, 0, 0.22);

                background:
                    #ffffff;

                color:
                    #222222;

                font-family:
                    Arial,
                    sans-serif
                    !important;

                font-size:
                    14px;

                line-height:
                    1.35;

                box-sizing:
                    border-box;
            }


            #${UPDATE_NOTICE_ID} * {

                box-sizing:
                    border-box;

                font-family:
                    Arial,
                    sans-serif
                    !important;
            }


            #${UPDATE_NOTICE_ID} .wiz-update-message {

                min-width:
                    0;
            }


            #${UPDATE_NOTICE_ID} .wiz-update-actions {

                display:
                    flex;

                align-items:
                    center;

                gap:
                    6px;

                flex:
                    0 0 auto;
            }


            #${UPDATE_NOTICE_ID} a {

                display:
                    inline-flex;

                align-items:
                    center;

                justify-content:
                    center;

                min-height:
                    36px;

                padding:
                    6px 10px;

                border:
                    1px solid #990000;

                border-radius:
                    4px;

                background:
                    #990000;

                color:
                    #ffffff
                    !important;

                font-weight:
                    700;

                text-decoration:
                    none;
            }


            #${UPDATE_NOTICE_ID} .wiz-update-dismiss {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                width:
                    36px;

                height:
                    36px;

                min-width:
                    36px;

                min-height:
                    36px;

                margin:
                    0;

                padding:
                    0;

                -webkit-appearance:
                    none !important;

                appearance:
                    none !important;

                border:
                    0 !important;

                border-radius:
                    4px;

                box-shadow:
                    none !important;

                background:
                    transparent;

                color:
                    #444444;

                font-size:
                    18px;

                line-height:
                    1;

                cursor:
                    pointer;
            }


            #${UPDATE_NOTICE_ID} .wiz-update-dismiss:hover,
            #${UPDATE_NOTICE_ID} .wiz-update-dismiss:focus {

                border:
                    0 !important;

                box-shadow:
                    none !important;

                background:
                    #eeeeee;

                color:
                    #111111;
            }


            /* ====================================================
               Small screens

               Keep the interface compact instead of enlarging
               controls on tablets / e-ink devices.
               ==================================================== */

            @media (max-width: 600px) {

                #ao3-wizard-ui {

                    top:
                        8px;

                    right:
                        8px;

                    width:
                        min(
                            320px,
                            calc(100vw - 16px)
                        );

                    max-height:
                        calc(100vh - 16px);
                }


                #${UPDATE_NOTICE_ID} {

                    align-items:
                        flex-start;

                    gap:
                        8px;

                    width:
                        calc(100vw - 16px);

                    bottom:
                        8px;

                    bottom:
                        max(
                            8px,
                            env(safe-area-inset-bottom)
                        );
                }
            }


            /* ====================================================
               E-ink / reduced-motion friendliness
               ==================================================== */

            @media
            (prefers-reduced-motion: reduce) {

                #ao3-wizard-ui *,
                #ao3-wizard-ui *::before,
                #ao3-wizard-ui *::after,
                #${WIZARD_LAUNCHER_ID} {

                    animation:
                        none
                        !important;

                    transition:
                        none
                        !important;
                }
            }
        `;


        (
            document.head ||
            document.documentElement
        ).appendChild(
            style
        );
    }


    // ============================================================
    // 13. HTML attribute escaping
    // ============================================================

    function escapeHtmlAttribute(value) {

        return String(value ?? '')

            .replace(
                /&/g,
                '&amp;'
            )

            .replace(
                /"/g,
                '&quot;'
            )

            .replace(
                /</g,
                '&lt;'
            )

            .replace(
                />/g,
                '&gt;'
            );
    }


    // ============================================================
    // 14. Settings panel
    // ============================================================

    let wizardKeyboardShortcutBound =
        false;


    function readWizardUIState() {

        try {

            const localState =
                window.localStorage.getItem(
                    WIZARD_UI_STATE_KEY
                );


            if (
                localState === 'minimized' ||
                localState === 'closed'
            ) {
                return localState;
            }

        } catch (error) {
            // Fall through to GM Storage when localStorage is unavailable.
        }


        if (
            typeof GM_getValue ===
            'function'
        ) {

            try {

                const storedState =
                    GM_getValue(
                        WIZARD_UI_STATE_KEY,
                        ''
                    );


                if (
                    storedState === 'minimized' ||
                    storedState === 'closed'
                ) {
                    return storedState;
                }

            } catch (error) {
                // A missing GM implementation simply means no saved state.
            }
        }


        return 'closed';
    }


    function writeWizardUIState(state) {

        const storedState =
            state === 'minimized'
                ? 'minimized'
                : 'closed';


        try {

            window.localStorage.setItem(
                WIZARD_UI_STATE_KEY,
                storedState
            );

        } catch (error) {
            // GM Storage below remains available as a fallback.
        }


        if (
            typeof GM_setValue ===
            'function'
        ) {

            try {

                const result =
                    GM_setValue(
                        WIZARD_UI_STATE_KEY,
                        storedState
                    );


                if (
                    result &&
                    typeof result.catch ===
                        'function'
                ) {
                    result.catch(
                        () => {}
                    );
                }

            } catch (error) {
                // UI state persistence is optional.
            }
        }
    }


    function setWizardUIState(state, event) {

        const container =
            document.getElementById(
                'ao3-wizard-ui'
            );


        const launcher =
            document.getElementById(
                WIZARD_LAUNCHER_ID
            );


        if (!container) {
            return;
        }


        if (event) {
            event.preventDefault();
        }


        container.style.display =
            state === 'open'
                ? 'block'
                : 'none';


        if (launcher) {
            launcher.style.display =
                state === 'minimized'
                    ? 'flex'
                    : 'none';
        }


        writeWizardUIState(
            state
        );
    }


    function toggleWizardUI(event) {

        const container =
            document.getElementById(
                'ao3-wizard-ui'
            );


        if (!container) {
            return;
        }


        const hidden =
            container.style.display ===
                'none' ||
            getComputedStyle(
                container
            ).display ===
                'none';


        setWizardUIState(
            hidden
                ? 'open'
                : 'closed',
            event
        );
    }


    function bindWizardKeyboardShortcut() {

        if (wizardKeyboardShortcutBound) {
            return;
        }


        wizardKeyboardShortcutBound =
            true;


        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.shiftKey &&
                    event.altKey &&
                    event.code === 'KeyW'
                ) {
                    toggleWizardUI(
                        event
                    );
                }
            }
        );
    }


    function createUI() {

        if (
            document.getElementById(
                'ao3-wizard-ui'
            )
        ) {
            return;
        }


        injectWizardStyles();


        const settings =
            getSettings();


        // ========================================================
        // Shared Userscripts menu
        // ========================================================

        const primaryNav =
            document.querySelector(
                '#header ul.primary'
            );


        if (primaryNav) {

            let userscriptMenu =
                primaryNav.querySelector(
                    'li#scriptconfig'
                );


            // ----------------------------------------------------
            // Try finding an existing Userscripts menu by label
            // ----------------------------------------------------

            if (!userscriptMenu) {

                const dropdowns =
                    primaryNav.querySelectorAll(
                        'li.dropdown'
                    );


                for (
                    const dropdown
                    of dropdowns
                ) {

                    const link =
                        dropdown.querySelector(
                            'a'
                        );


                    if (
                        link &&
                        link.textContent
                            .trim()
                            .toLowerCase() ===
                            'userscripts'
                    ) {

                        userscriptMenu =
                            dropdown;

                        break;
                    }
                }
            }


            let menuList =
                null;


            // ----------------------------------------------------
            // Existing shared menu
            // ----------------------------------------------------

            if (userscriptMenu) {

                menuList =
                    userscriptMenu.querySelector(
                        'ul.menu'
                    );
            }


            // ----------------------------------------------------
            // Create one if none exists
            // ----------------------------------------------------

            else {

                userscriptMenu =
                    document.createElement(
                        'li'
                    );


                userscriptMenu.className =
                    'dropdown';


                userscriptMenu.id =
                    'scriptconfig';


                userscriptMenu.innerHTML = `

                    <a
                        class="dropdown-toggle"
                        href="/"
                        data-toggle="dropdown"
                        data-target="#"
                    >
                        Userscripts
                    </a>

                    <ul
                        class="menu dropdown-menu"
                        role="menu"
                    ></ul>
                `;


                const searchItem =
                    primaryNav.querySelector(
                        'li.search'
                    );


                if (searchItem) {

                    primaryNav.insertBefore(
                        userscriptMenu,
                        searchItem
                    );

                } else {

                    primaryNav.appendChild(
                        userscriptMenu
                    );
                }


                menuList =
                    userscriptMenu.querySelector(
                        'ul.menu'
                    );
            }


            // ----------------------------------------------------
            // Add Site Wizard
            // ----------------------------------------------------

            if (
                menuList &&
                !document.getElementById(
                    'opencfg_site_wizard'
                )
            ) {

                const menuItem =
                    document.createElement(
                        'li'
                    );


                menuItem.innerHTML = `

                    <a
                        href="javascript:void(0);"
                        id="opencfg_site_wizard"
                    >
                        Site Wizard - 优化版
                    </a>
                `;


                menuList.appendChild(
                    menuItem
                );
            }
        }


        // ========================================================
        // Panel
        // ========================================================

        const container =
            document.createElement(
                'div'
            );


        container.id =
            'ao3-wizard-ui';


        container.innerHTML = `

            <div class="wiz-header">

                <div class="wiz-title-group">

                    <h3 class="wiz-title">
                        AO3 Site Wizard
                    </h3>


                    <span class="wiz-current-version">
                        v${SCRIPT_VERSION || '?'}
                    </span>


                    <a
                        id="${UPDATE_LINK_ID}"
                        class="wiz-version-update"
                        href="${UPDATE_PAGE_URL}"
                        target="_blank"
                        rel="noopener noreferrer"
                        hidden
                    ></a>

                </div>


                <div class="wiz-header-actions">

                    <button
                        type="button"
                        id="wiz-minimize"
                        class="wiz-header-button wiz-minimize-button"
                        aria-label="最小化设置面板"
                        title="最小化"
                    ></button>


                    <button
                        type="button"
                        id="wiz-close"
                        class="wiz-header-button wiz-close-button"
                        aria-label="关闭设置面板"
                        title="关闭"
                    >
                        ✕
                    </button>

                </div>

            </div>


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-enable"
                    ${
                        settings.enabled
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    启用自定义样式
                </span>

            </label>


            <hr class="wiz-divider">


            <div class="wiz-field-row wiz-font-row">


                <label class="wiz-field">

                    中文字体

                    <select id="wiz-font-preset">

                    <option
                        value="system"
                        ${
                            settings.fontPreset ===
                                'system'
                                ? 'selected'
                                : ''
                        }
                    >系统</option>

                    <option
                        value="wenkai"
                        ${
                            settings.fontPreset ===
                                'wenkai'
                                ? 'selected'
                                : ''
                        }
                    >霞鹜文楷（默认）</option>

                    <option
                        value="clearHanSerif"
                        ${
                            settings.fontPreset ===
                                'clearHanSerif'
                                ? 'selected'
                                : ''
                        }
                    >屏显臻宋</option>

                    <option
                        value="jinshuSong"
                        ${
                            settings.fontPreset ===
                                'jinshuSong'
                                ? 'selected'
                                : ''
                        }
                    >寒蝉锦书宋 Pro</option>

                    <option
                        value="kingHwaOldSong"
                        ${
                            settings.fontPreset ===
                                'kingHwaOldSong'
                                ? 'selected'
                                : ''
                        }
                    >京华老宋体</option>

                    <option
                        value="cheeseFoamOolong"
                        ${
                            settings.fontPreset ===
                                'cheeseFoamOolong'
                                ? 'selected'
                                : ''
                        }
                    >芝士奶盖乌龙</option>

                    <option
                        value="chillKai"
                        ${
                            settings.fontPreset ===
                                'chillKai'
                                ? 'selected'
                                : ''
                        }
                    >寒蝉正楷体</option>

                    <option
                        value="sarasaUiSC"
                        ${
                            settings.fontPreset ===
                                'sarasaUiSC'
                                ? 'selected'
                                : ''
                        }
                    >更纱黑体</option>

                    <option
                        value="dongGuan"
                        ${
                            settings.fontPreset ===
                                'dongGuan'
                                ? 'selected'
                                : ''
                        }
                    >上图东观</option>

                    <option
                        value="custom"
                        ${
                            settings.fontPreset ===
                                'custom'
                                ? 'selected'
                                : ''
                        }
                    >自定义</option>

                    </select>

                </label>


                <label class="wiz-field">

                    西文字体

                    <select id="wiz-latin-font-preset">

                    <option
                        value="follow"
                        ${
                            settings.latinFontPreset ===
                                'follow'
                                ? 'selected'
                                : ''
                        }
                    >跟随中文（默认）</option>

                    <option
                        value="atkinson"
                        ${
                            settings.latinFontPreset ===
                                'atkinson'
                                ? 'selected'
                                : ''
                        }
                    >Atkinson</option>

                    <option
                        value="googleSans"
                        ${
                            settings.latinFontPreset ===
                                'googleSans'
                                ? 'selected'
                                : ''
                        }
                    >Google Sans</option>

                    <option
                        value="merriweather"
                        ${
                            settings.latinFontPreset ===
                                'merriweather'
                                ? 'selected'
                                : ''
                        }
                    >Merriweather</option>

                    <option
                        value="literata"
                        ${
                            settings.latinFontPreset ===
                                'literata'
                                ? 'selected'
                                : ''
                        }
                    >Literata</option>

                    <option
                        value="sourceSerif"
                        ${
                            settings.latinFontPreset ===
                                'sourceSerif'
                                ? 'selected'
                                : ''
                        }
                    >Source Serif 4</option>

                    </select>

                </label>


            </div>


            <div
                id="wiz-custom-font-field"
                class="wiz-field wiz-custom-font-field"
                ${
                    settings.fontPreset ===
                        'custom'
                        ? ''
                        : 'hidden'
                }
            >

                自定义 font-family

                <input
                    type="text"
                    id="wiz-work-font"
                    value="${
                        escapeHtmlAttribute(
                            settings.customWorkFont
                        )
                    }"
                >


                <label class="wiz-toggle-row wiz-custom-weight-toggle">

                    <input
                        type="checkbox"
                        id="wiz-custom-font-bold"
                        ${
                            settings.customFontBold
                                ? 'checked'
                                : ''
                        }
                    >

                    <span>加粗（600）</span>

                </label>

            </div>


            <div class="wiz-field-row">


                <label class="wiz-field">

                    字号

                    <input
                        type="text"
                        id="wiz-font-size"
                        value="${
                            escapeHtmlAttribute(
                                settings.fontSize
                            )
                        }"
                    >

                </label>


                <label class="wiz-field">

                    行高

                    <input
                        type="text"
                        id="wiz-line-height"
                        value="${
                            escapeHtmlAttribute(
                                settings.lineHeight
                            )
                        }"
                    >

                </label>

            </div>


            <div class="wiz-field-row">


                <label class="wiz-field">

                    字间距

                    <input
                        type="text"
                        id="wiz-letter-spacing"
                        value="${
                            escapeHtmlAttribute(
                                settings.letterSpacing
                            )
                        }"
                    >

                </label>


                <label class="wiz-field">

                    段间距

                    <input
                        type="text"
                        id="wiz-para-spacing"
                        value="${
                            escapeHtmlAttribute(
                                settings.paragraphSpacing
                            )
                        }"
                    >

                </label>

            </div>


            <div class="wiz-field-row">


                <label class="wiz-field">

                    最大版宽

                    <input
                        type="text"
                        id="wiz-max-width"
                        value="${
                            escapeHtmlAttribute(
                                settings.maxWidth
                            )
                        }"
                    >

                </label>


                <label class="wiz-field">

                    下一章加载模式

                    <select id="wiz-next-chapter-loading-mode">

                        <option
                            value="none"
                            ${
                                settings.nextChapterLoadingMode ===
                                    'none'
                                    ? 'selected'
                                    : ''
                            }
                        >
                            无
                        </option>

                        <option
                            value="seamless"
                            ${
                                settings.nextChapterLoadingMode ===
                                    'seamless'
                                    ? 'selected'
                                    : ''
                            }
                        >
                            无缝加载
                        </option>

                        <option
                            value="prefetch"
                            ${
                                settings.nextChapterLoadingMode ===
                                    'prefetch'
                                    ? 'selected'
                                    : ''
                            }
                        >
                            下一页预载入
                        </option>

                    </select>

                </label>

            </div>


            <hr class="wiz-divider">


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-clean-breaks"
                    ${
                        settings.cleanBreaks
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    移除多余空行 / 空段落
                </span>

            </label>


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-space-cjk-english"
                    ${
                        settings.spaceCjkEnglish
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    中英文之间自动加空格
                </span>

            </label>


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-indent"
                    ${
                        settings.enableIndent
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    首行缩进 2 个中文字符
                </span>

            </label>


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-justify"
                    ${
                        settings.justifyText
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    正文两端对齐
                </span>

            </label>


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-contrast"
                    ${
                        settings.highContrast
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    强制纯黑文字 + 纯白背景
                </span>

            </label>


            <label class="wiz-toggle-row">

                <input
                    type="checkbox"
                    id="wiz-hide-notes"
                    ${
                        settings.hideNotes
                            ? 'checked'
                            : ''
                    }
                >

                <span class="wiz-toggle-label">
                    隐藏作者前言 / 后记 (Notes)
                </span>

            </label>


            <div class="wiz-save-area">

                <button
                    type="button"
                    id="wiz-save"
                    class="wiz-save-button"
                >
                    保存并生效
                </button>

            </div>
        `;


        document.body.appendChild(
            container
        );


        const launcher =
            document.createElement(
                'button'
            );


        launcher.id =
            WIZARD_LAUNCHER_ID;


        launcher.type =
            'button';


        launcher.textContent =
            'Aa';


        launcher.setAttribute(
            'aria-label',
            '展开 Site Wizard 设置面板'
        );


        launcher.title =
            '展开 Site Wizard';


        document.body.appendChild(
            launcher
        );


        if (
            readWizardUIState() ===
            'minimized'
        ) {
            setWizardUIState(
                'minimized'
            );
        }


        updatePanelVersionIndicator(
            readUpdateCheckState()
                .latestVersion
        );


        // ========================================================
        // Navigation entry
        // ========================================================

        const navLink =
            document.getElementById(
                'opencfg_site_wizard'
            );


        if (navLink) {

            navLink.addEventListener(
                'click',
                toggleWizardUI
            );
        }


        // ========================================================
        // Minimize, restore, and close
        // ========================================================

        document
            .getElementById(
                'wiz-minimize'
            )
            .addEventListener(
                'click',
                event => {

                    setWizardUIState(
                        'minimized',
                        event
                    );
                }
            );


        launcher.addEventListener(
            'click',
            event => {

                setWizardUIState(
                    'open',
                    event
                );
            }
        );


        document
            .getElementById(
                'wiz-close'
            )
            .addEventListener(
                'click',
                event => {

                    setWizardUIState(
                        'closed',
                        event
                    );
                }
            );


        // ========================================================
        // Font preset / custom font field
        // ========================================================

        const fontPresetSelect =
            document.getElementById(
                'wiz-font-preset'
            );


        const latinFontPresetSelect =
            document.getElementById(
                'wiz-latin-font-preset'
            );


        const customFontField =
            document.getElementById(
                'wiz-custom-font-field'
            );


        fontPresetSelect.addEventListener(
            'change',
            () => {

                customFontField.hidden =
                    fontPresetSelect.value !==
                    'custom';
            }
        );


        // ========================================================
        // Shift + Alt + W
        // ========================================================

        bindWizardKeyboardShortcut();


        // ========================================================
        // Save
        // ========================================================

        const saveButton =
            document.getElementById(
                'wiz-save'
            );


        let saveFeedbackTimer =
            null;


        saveButton.addEventListener(
            'click',
            () => {


                const currentSettings =
                    getSettings();


                const fontPreset =
                    FONT_PRESET_IDS.has(
                        fontPresetSelect.value
                    )
                        ? fontPresetSelect.value
                        : 'wenkai';


                const customWorkFont =
                    document
                        .getElementById(
                            'wiz-work-font'
                        )
                        .value
                        .trim();


                const latinFontPreset =
                    LATIN_FONT_PRESET_IDS.has(
                        latinFontPresetSelect.value
                    )
                        ? latinFontPresetSelect.value
                        : 'follow';


                const customFontBold =
                    document
                        .getElementById(
                            'wiz-custom-font-bold'
                        )
                        .checked;


                const newSettings = {

                    enabled:
                        document
                            .getElementById(
                                'wiz-enable'
                            )
                            .checked,


                    /*
                     * siteFont currently has no separate UI field,
                     * so preserve the stored setting.
                     */

                    siteFont:
                        currentSettings.siteFont,


                    fontPreset,


                    latinFontPreset,


                    customWorkFont,


                    customFontBold,


                    workFont:
                        getCombinedWorkFont(
                            fontPreset,
                            customWorkFont,
                            latinFontPreset
                        ),


                    fontWeight:
                        getPresetFontWeight(
                            fontPreset,
                            customFontBold
                        ),


                    fontSize:
                        document
                            .getElementById(
                                'wiz-font-size'
                            )
                            .value
                            .trim(),


                    lineHeight:
                        document
                            .getElementById(
                                'wiz-line-height'
                            )
                            .value
                            .trim(),


                    letterSpacing:
                        document
                            .getElementById(
                                'wiz-letter-spacing'
                            )
                            .value
                            .trim(),


                    paragraphSpacing:
                        document
                            .getElementById(
                                'wiz-para-spacing'
                            )
                            .value
                            .trim(),


                    maxWidth:
                        document
                            .getElementById(
                                'wiz-max-width'
                            )
                            .value
                            .trim(),


                    cleanBreaks:
                        document
                            .getElementById(
                                'wiz-clean-breaks'
                            )
                            .checked,


                    spaceCjkEnglish:
                        document
                            .getElementById(
                                'wiz-space-cjk-english'
                            )
                            .checked,


                    nextChapterLoadingMode:
                        document
                            .getElementById(
                                'wiz-next-chapter-loading-mode'
                            )
                            .value,


                    enableIndent:
                        document
                            .getElementById(
                                'wiz-indent'
                            )
                            .checked,


                    justifyText:
                        document
                            .getElementById(
                                'wiz-justify'
                            )
                            .checked,


                    highContrast:
                        document
                            .getElementById(
                                'wiz-contrast'
                            )
                            .checked,


                    hideNotes:
                        document
                            .getElementById(
                                'wiz-hide-notes'
                            )
                            .checked
                };


                // ------------------------------------------------
                // Persist to GM Storage
                // ------------------------------------------------

                saveSettings(
                    newSettings
                );


                // ------------------------------------------------
                // Apply immediately
                // ------------------------------------------------

                applyStyles();


                // ------------------------------------------------
                // Rebuild observer
                // ------------------------------------------------

                observeWorkContent();


                scheduleNextChapterPreload();


                // ------------------------------------------------
                // Save feedback
                //
                // Deliberately does NOT close the panel.
                // ------------------------------------------------

                clearTimeout(
                    saveFeedbackTimer
                );


                saveButton.textContent =
                    '✓ 已保存';


                saveButton.classList.add(
                    'saved'
                );


                saveFeedbackTimer =
                    setTimeout(
                        () => {

                            saveButton.textContent =
                                '保存并生效';


                            saveButton.classList.remove(
                                'saved'
                            );
                        },
                        1200
                    );
            }
        );
    }


    // ============================================================
    // 15. Initialization
    // ============================================================

    /*
     * Apply the reading CSS as early as possible.
     *
     * At document-start the work body may not exist yet;
     * processWorkContent() safely exits in that situation.
     */

    configureSeamlessScrollRestoration();

    applyStyles();


    function initialize() {

        injectWizardStyles();

        createUI();


        // --------------------------------------------------------
        // Initial cleanup
        // --------------------------------------------------------

        processWorkContent();


        // --------------------------------------------------------
        // A refreshed continuous-reading entry starts at its chapter
        // --------------------------------------------------------

        restoreLatestChapterHeading();


        // --------------------------------------------------------
        // Observe later DOM changes
        // --------------------------------------------------------

        observeWorkContent();


        // --------------------------------------------------------
        // Preload the next chapter without delaying current content
        // --------------------------------------------------------

        scheduleNextChapterPreload();


        // --------------------------------------------------------
        // Check for script updates only after the page is usable
        // --------------------------------------------------------

        scheduleUpdateCheck();


        /*
         * Safety passes for AO3 or other userscripts that populate
         * content shortly after DOMContentLoaded.
         */

        setTimeout(
            processWorkContent,
            250
        );


        setTimeout(
            processWorkContent,
            1000
        );
    }


    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }

})();
