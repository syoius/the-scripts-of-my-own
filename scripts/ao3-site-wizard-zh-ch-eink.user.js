// ==UserScript==
// @name         AO3: Site Wizard - ZH-CN & E-Ink Reader Optimised
// @name:zh-CN   AO3：Site Wizard - 中文 & 墨水屏设备优化版
// @namespace    https://greasyfork.org/users/1639523-syoius
// @version      1.9.0
// @description  A compact reading-focused edition of AO3: Site Wizard with LXGW WenKai, enhanced blank-line cleanup, resilient settings storage, and configurable reading layout.
// @description:zh-CN  AO3 阅读优化脚本：集成霞鹜文楷、正文排版、异常空行清理、兼容式设置存储、高对比度模式及紧凑触控设置面板。
// @author       syoius
// @match        *://archiveofourown.org/*
// @match        *://*.archiveofourown.org/*
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
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
 * - enhanced removal of empty paragraphs and nested blank elements
 * - optional spacing between adjacent Chinese and English text
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
 * External font:
 *
 *   LXGW WenKai Screen Web
 *   https://github.com/CMBill/lxgw-wenkai-screen-web
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


    const DEFAULT_SETTINGS = {

        enabled: true,

        siteFont:
            '"LXGW WenKai GB Screen", "LXGW WenKai Screen", serif',

        workFont:
            '"LXGW WenKai GB Screen", "LXGW WenKai Screen", serif',

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
            false,

        cleanBreaks:
            true,

        spaceCjkEnglish:
            true,

        justifyText:
            true,

        highContrast:
            true,

        hideNotes:
            false
    };


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

            return {
                ...DEFAULT_SETTINGS,
                ...stored
            };
        }


        return {
            ...DEFAULT_SETTINGS
        };
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
    // 6. Chinese / English spacing
    // ============================================================

    const HAN_CHARACTER =
        /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;


    const ASCII_WORD_CHARACTER =
        /[A-Za-z0-9]/;


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


    function needsCjkEnglishSpace(left, right) {

        return (
            HAN_CHARACTER.test(left) &&
            ASCII_WORD_CHARACTER.test(right)
        ) || (
            ASCII_WORD_CHARACTER.test(left) &&
            HAN_CHARACTER.test(right)
        );
    }


    function addSpacingWithinText(text) {

        return text
            .replace(
                /([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])([A-Za-z0-9])/g,
                '$1 $2'
            )
            .replace(
                /([A-Za-z0-9])([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/g,
                '$1 $2'
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


                if (
                    previousTextNode &&
                    needsCjkEnglishSpace(
                        previousTextNode
                            .nodeValue
                            .slice(-1),
                        spacedText.charAt(0)
                    )
                ) {
                    spacedText =
                        ` ${spacedText}`;
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

        addCjkEnglishSpacing();
    }


    // ============================================================
    // 7. Dynamic work-content observer
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
    // 8. Reading styles
    // ============================================================

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

            return;
        }


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
            #workskin .userstuff p,
            #workskin .userstuff blockquote {

                ${settings.workFont ? `

                font-family:
                    ${settings.workFont}
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
    // 9. Compact settings-panel CSS
    // ============================================================

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


            /* ====================================================
               Close button
               ==================================================== */

            #ao3-wizard-ui .wiz-close-button {

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
                    -3px -3px -3px 6px;

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


            #ao3-wizard-ui .wiz-close-button:hover,
            #ao3-wizard-ui .wiz-close-button:focus,
            #ao3-wizard-ui .wiz-close-button:active {

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

                margin-bottom:
                    7px;

                font-size:
                    12.5px;

                font-weight:
                    600;

                color:
                    #333333;
            }


            #ao3-wizard-ui input[type="text"] {

                display:
                    block;

                width:
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


            #ao3-wizard-ui input[type="text"]:focus {

                outline:
                    1px solid #990000;

                outline-offset:
                    0;

                border-color:
                    #990000;
            }


            /* ====================================================
               Two-column fields
               ==================================================== */

            #ao3-wizard-ui .wiz-field-row {

                display:
                    grid;

                grid-template-columns:
                    1fr 1fr;

                gap:
                    8px;
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
            }


            /* ====================================================
               E-ink / reduced-motion friendliness
               ==================================================== */

            @media
            (prefers-reduced-motion: reduce) {

                #ao3-wizard-ui *,
                #ao3-wizard-ui *::before,
                #ao3-wizard-ui *::after {

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
    // 10. HTML attribute escaping
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
    // 11. Settings panel
    // ============================================================

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

                <h3 class="wiz-title">
                    AO3 Site Wizard
                </h3>


                <button
                    type="button"
                    id="wiz-close"
                    class="wiz-close-button"
                    aria-label="Close settings"
                    title="Close"
                >
                    ✕
                </button>

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


            <label class="wiz-field">

                正文字体 (Work Font)

                <input
                    type="text"
                    id="wiz-work-font"
                    value="${
                        escapeHtmlAttribute(
                            settings.workFont
                        )
                    }"
                >

            </label>


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


        // ========================================================
        // Open / close
        // ========================================================

        const toggleUI =
            event => {

                if (event) {
                    event.preventDefault();
                }


                const hidden =

                    container.style.display ===
                        'none'

                    ||

                    getComputedStyle(
                        container
                    ).display ===
                        'none';


                container.style.display =
                    hidden
                        ? 'block'
                        : 'none';
            };


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
                toggleUI
            );
        }


        // ========================================================
        // Explicit close button
        // ========================================================

        document
            .getElementById(
                'wiz-close'
            )
            .addEventListener(
                'click',
                () => {

                    container.style.display =
                        'none';
                }
            );


        // ========================================================
        // Shift + Alt + W
        // ========================================================

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.shiftKey &&
                    event.altKey &&
                    event.code === 'KeyW'
                ) {

                    toggleUI(
                        event
                    );
                }
            }
        );


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


                    workFont:
                        document
                            .getElementById(
                                'wiz-work-font'
                            )
                            .value
                            .trim(),


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
    // 12. Initialization
    // ============================================================

    /*
     * Apply the reading CSS as early as possible.
     *
     * At document-start the work body may not exist yet;
     * processWorkContent() safely exits in that situation.
     */

    applyStyles();


    function initialize() {

        injectWizardStyles();

        createUI();


        // --------------------------------------------------------
        // Initial cleanup
        // --------------------------------------------------------

        processWorkContent();


        // --------------------------------------------------------
        // Observe later DOM changes
        // --------------------------------------------------------

        observeWorkContent();


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
