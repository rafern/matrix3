import { State } from './tri-state-checkbox.js'

// TODO move table state into a dedicated data struct, so that it can be used to
//      determine effective state

/**
 * Enum for CSP directives. Numeric, so don't use this directly for the browser
 * APIs. Convert it to actual directives via RULE_DIRECTIVES.
 *
 * @see {@link RULE_DIRECTIVES}
 * @readonly
 * @enum {number}
 */
export const RuleDirective = Object.freeze({
    DEFAULT: 0, SCRIPT: 1, STYLE: 2, IMG: 3, FRAME: 4, FONT: 5, MEDIA: 6,
    CONNECT: 7, WORKER: 8, CHILD: 9, MANIFEST: 10, OBJECT: 11,
});

export const RULE_DIRECTIVES = Object.freeze([
    'default-src', 'script-src', 'style-src', 'img-src', 'frame-src',
    'font-src', 'media-src', 'connect-src', 'worker-src', 'child-src',
    'manifest-src', 'object-src',
]);

export const RULE_DIRECTIVE_EMOJIS = Object.freeze([
    '📌', '📜', '🦚', '🖼️', '🪟', '🔤', '📽️', '🔌', '🔧', '👶', '🪪', '🧩',
]);

export const RULE_DEFAULT_SOURCES = Object.freeze([
    "'none'", "'self'", "'strict-dynamic'", "'unsafe-eval'", "'unsafe-hashes'",
    "'unsafe-inline'", "'wasm-unsafe-eval'", "blob:", "data:", "http:",
    "https:",
]);

function tableHoverColSelectors(colCount, extraPseudo = '') {
    let selectors = [];
    for (let c = 0; c < colCount; c++) {
        selectors.push(`.table:has(.cell:nth-child(${colCount}n+${c}):hover) .cell:nth-child(${colCount}n+${c})${extraPseudo}`);
    }

    return selectors.join(',\n');
}

const STYLES = `
:host {
    --fallback-color: Field;
}

.table {
    display: grid;
    grid-template-columns: 1fr repeat(${RULE_DIRECTIVES.length}, min-content);
    border-right: 1px solid currentColor;
    border-bottom: 1px solid currentColor;
}

.row {
    display: grid;
    grid-column: span ${RULE_DIRECTIVES.length + 1};
    grid-template-columns: subgrid;
    border-top: 1px solid currentColor;

    &:hover {
        background: var(--fallback-color);
    }
}

.cell {
    text-align: center;
    border-left: 1px solid currentColor;
}

${tableHoverColSelectors(RULE_DIRECTIVES.length + 1, ':not(.source-header-cell):not(.lead-header-cell)')},
.row:hover {
    background: var(--fallback-color);
    filter: grayscale(35%) brightness(1.25);
}

.lead-header-cell, .directive-header-cell {
    user-select: none;
    font-size: 16px;
    font-weight: 700;
}

.source-header-cell {
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
}
`;

class RuleTable extends HTMLElement {
    /**
     * @type {Array<string>}
     */
    #sources = [];
    /**
     * 2D array containing the sources assigned to a directive. Note that
     * setting the "'none'" source needs special attention. First index is for
     * the source, and the second is for the directive. For example:
     * ```
     * this.#sourceDirectives[this.#sourceIndex("data:")][RuleDirective.FONT] = State.ALLOW;
     * ```
     * ... adds `font-src data:` to the policy. Prefer using the helper methods
     * to avoid verbose code.
     *
     * @type {Array<Array<State>>}
     */
    #sourceDirectives = [];
    #tableDiv;

    constructor() {
        super()

        for (const source of RULE_DEFAULT_SOURCES) {
            this.#addSource(source);
        }
    }

    connectedCallback() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(STYLES);

        const shadow = this.attachShadow({ mode: 'closed' });
        shadow.adoptedStyleSheets = [sheet];

        this.#tableDiv = document.createElement('div');
        this.#tableDiv.classList.add('table');

        const headerRowDiv = document.createElement('div');
        headerRowDiv.classList.add('row');
        this.#tableDiv.appendChild(headerRowDiv);

        const leadDiv = document.createElement('div');
        leadDiv.classList.add('cell', 'lead-header-cell');
        leadDiv.textContent = 'Source';
        headerRowDiv.appendChild(leadDiv);

        for (let d = 0; d < RULE_DIRECTIVES.length; d++) {
            const dirDiv = document.createElement('div');
            dirDiv.classList.add('directive-header-cell');
            dirDiv.textContent = RULE_DIRECTIVE_EMOJIS[d];
            const dirChk = document.createElement('tri-state-checkbox');
            dirChk.classList.add('cell');
            dirChk.appendChild(dirDiv);
            headerRowDiv.appendChild(dirChk);
        }

        for (let s = 1; s < this.#sources.length; s++) {
            this.#addSourceUI(s);
        }

        shadow.appendChild(this.#tableDiv);
    }

    disconnectedCallback() {
        this.#tableDiv = undefined;
    }

    /**
     * Get the row index of a source in the table. Note that row 0 ("'none'") is
     * the table header.
     *
     * @param {string} source The source as-is in the CSP
     * @returns {number} The index of the source, or -1 if not in the table
     */
    #sourceIndex(source) {
        return this.#sources.indexOf(source);
    }

    #addSourceUI(sourceIdx) {
        if (!this.#tableDiv) return;

        const rowDiv = document.createElement('div');
        rowDiv.classList.add('row');
        this.#tableDiv.appendChild(rowDiv);

        const srcDiv = document.createElement('div');
        srcDiv.classList.add('cell', 'source-header-cell');
        srcDiv.textContent = this.#sources[sourceIdx];
        rowDiv.appendChild(srcDiv);

        for (let d = 0; d < RULE_DIRECTIVES.length; d++) {
            const dirChk = document.createElement('tri-state-checkbox');
            dirChk.classList.add('cell');
            rowDiv.appendChild(dirChk);
        }
    }

    #addSource(source) {
        const idx = this.#sources.length;
        this.#sources.push(source);
        this.#sourceDirectives.push(new Array(RULE_DIRECTIVES.length).fill(State.PASSTHROUGH));
        this.#addSourceUI(idx);
    }
}

customElements.define("rule-table", RuleTable);