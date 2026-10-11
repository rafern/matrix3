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

const STYLES = `
.table {
    display: grid;
    grid-template-columns: 1fr repeat(${RULE_DIRECTIVES.length}, min-content);
}

.cell {
    border: 1px solid grey;
    text-align: center;
}

.lead-header-cell, .directive-header-cell {
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

        const labelDiv = document.createElement('div');
        labelDiv.classList.add('cell', 'lead-header-cell');
        labelDiv.textContent = 'Source';
        this.#tableDiv.appendChild(labelDiv);

        for (let d = 0; d < RULE_DIRECTIVES.length; d++) {
            const dirDiv = document.createElement('div');
            dirDiv.classList.add('cell', 'directive-header-cell');
            dirDiv.textContent = RULE_DIRECTIVE_EMOJIS[d];
            this.#tableDiv.appendChild(dirDiv);
        }

        for (let s = 0; s < this.#sources.length; s++) {
            this.#addSourceUI(s);
        }

        shadow.appendChild(this.#tableDiv);
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

        const srcDiv = document.createElement('div');
        srcDiv.classList.add('cell', 'source-header-cell');
        srcDiv.textContent = this.#sources[sourceIdx];
        this.#tableDiv.appendChild(srcDiv);

        for (let d = 0; d < RULE_DIRECTIVES.length; d++) {
            const dirDiv = document.createElement('tri-state-checkbox');
            this.#tableDiv.appendChild(dirDiv);
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