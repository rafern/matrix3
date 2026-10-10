const STYLES = `
div {
    --violation-color: orange;
    --passive-allow-color: lightgreen;
    --passive-deny-color: lightcoral;
    --allow-color: green;
    --deny-color: red;
    --min-len: 20px;

    min-width: var(--min-len);
    min-height: var(--min-len);
    overflow: hidden;
    border: 1px solid grey;
    user-select: none;
    display: inline-block;

    &:not(.disabled) {
        cursor: pointer;
    }
}

div:hover:not(.disabled), .hover:not(.disabled) {
    filter: brightness(1.3);
}

div.passive-allow {
    background: var(--passive-allow-color);
}

div.passive-deny {
    background: var(--passive-deny-color);
}

div.allow {
    background: var(--allow-color);
}

div.deny {
    background: var(--deny-color);
}

div.violation {
    background: var(--violation-color);

    &.passive-allow:not(.allow) {
        background: repeating-linear-gradient(
            -45deg,
            var(--violation-color),
            var(--violation-color) 4px,
            var(--passive-allow-color) 4px,
            var(--passive-allow-color) 8px
        );
    }

    &.passive-deny:not(.allow) {
        background: repeating-linear-gradient(
            -45deg,
            var(--violation-color),
            var(--violation-color) 4px,
            var(--passive-deny-color) 4px,
            var(--passive-deny-color) 8px
        );
    }

    &.allow {
        background: repeating-linear-gradient(
            -45deg,
            var(--violation-color),
            var(--violation-color) 4px,
            var(--allow-color) 4px,
            var(--allow-color) 8px
        ) !important;
    }

    &.deny {
        background: repeating-linear-gradient(
            -45deg,
            var(--violation-color),
            var(--violation-color) 4px,
            var(--deny-color) 4px,
            var(--deny-color) 8px
        ) !important;
    }
}
`;

export const State = Object.freeze({
    PASSTHROUGH: 0,
    ALLOW: 1,
    DENY: 2,
});

function validateState(x) {
    switch (x) {
    case State.PASSTHROUGH:
    case State.ALLOW:
    case State.DENY:
        return;
    default:
        throw new TypeError('Invalid tri-state-checkbox state');
    }
}

class TriStateCheckbox extends HTMLElement {
    #state = State.PASSTHROUGH;
    #passiveState = State.PASSTHROUGH;
    #div;
    #slot;
    #onDown;
    #onDragDown;
    #onContext;

    constructor() {
        super();

        this.#onDown = (e) => {
            switch (e.button) {
            case 0: if (e.buttons & 1) this.#tryUserClick(false); break;
            case 2: if (e.buttons & 2) this.#tryUserClick(true); break;
            }
        };

        this.#onDragDown = (e) => {
            if (e.buttons === 3) return;
            if (e.buttons & 1) this.#tryUserClick(false);
            if (e.buttons & 2) this.#tryUserClick(true);
        };

        this.#onContext = (e) => {
            e.preventDefault();
        }
    }

    static get observedAttributes() {
        return ['hover', 'violation', 'disabled'];
    }

    /**
     * Current state of checkbox. Enum with 3 states:
     * - 0: passthrough
     * - 1: allow
     * - 2: deny
     */
    get value() {
        return this.#state;
    }

    set value(value) {
        validateState(value);
        if (this.#state === value) return;
        this.#state = value;
        this.#updateState();
    }

    /**
     * What to display (in a lighter tone) when this.value is State.PASSTHROUGH
     */
    get passiveValue() {
        return this.#passiveState;
    }

    set passiveValue(value) {
        validateState(value);
        if (this.#passiveState === value) return;
        this.#passiveState = value;
        this.#updatePassiveState();
    }

    connectedCallback() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(STYLES);

        const shadow = this.attachShadow({ mode: 'closed' });
        shadow.adoptedStyleSheets = [sheet];

        this.#slot = document.createElement('slot');
        this.#div = document.createElement('div');
        this.#div.appendChild(this.#slot);

        this.#div.addEventListener('mousedown', this.#onDown);
        this.#div.addEventListener('mouseover', this.#onDragDown);
        this.#div.addEventListener('contextmenu', this.#onContext);
        this.#updateState();
        this.#updatePassiveState();
        this.#updateAttr_Hover();
        this.#updateAttr_Violation();
        this.#updateAttr_Disabled();

        shadow.appendChild(this.#div);
    }

    disconnectedCallback() {
        this.#slot = undefined;
        this.#div.removeEventListener('mousedown', this.#onDown);
        this.#div.removeEventListener('mouseover', this.#onDragDown);
        this.#div.removeEventListener('contextmenu', this.#onContext);
        this.#div = undefined;
    }

    click() {
        switch (this.#state) {
        case State.PASSTHROUGH: this.value = State.ALLOW; break;
        case State.ALLOW: this.value = State.DENY; break;
        case State.DENY: this.value = State.PASSTHROUGH; break;
        }
    }

    rightClick() {
        switch (this.#state) {
        case State.PASSTHROUGH: this.value = State.DENY; break;
        case State.ALLOW: this.value = State.PASSTHROUGH; break;
        case State.DENY: this.value = State.ALLOW; break;
        }
    }

    attributeChangedCallback(name, _oldValue, _newValue) {
        switch (name) {
        case 'hover': this.#updateAttr_Hover(); break;
        case 'violation': this.#updateAttr_Violation(); break;
        case 'disabled': this.#updateAttr_Disabled(); break;
        }
    }

    #tryUserClick(isRightClick) {
        if (this.hasAttribute('disabled')) return;

        const doChange = this.dispatchEvent(new CustomEvent("input", {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: { isRightClick },
        }));

        if (doChange) {
            if (isRightClick) {
                this.rightClick();
            } else {
                this.click();
            }

            this.dispatchEvent(new CustomEvent("change", {
                bubbles: true,
                cancelable: false,
                composed: true,
            }));
        }
    }

    #addOrDelClass(elem, add, className) {
        if (!elem) return;
        if (add) {
            elem.classList.add(className);
        } else {
            elem.classList.remove(className);
        }
    }

    #updateAttr_Hover() {
        this.#addOrDelClass(this.#div, this.hasAttribute('hover'), 'hover');
    }

    #updateAttr_Violation() {
        this.#addOrDelClass(this.#div, this.hasAttribute('violation'), 'violation');
    }

    #updateAttr_Disabled() {
        this.#addOrDelClass(this.#div, this.hasAttribute('disabled'), 'disabled');
    }

    #updateStateShared(prefix, state) {
        if (!this.#div) return;
        const allow = `${prefix}allow`;
        const deny = `${prefix}deny`;
        this.#div.classList.remove(allow, deny);

        switch (state) {
        case State.ALLOW: this.#div.classList.add(allow); break;
        case State.DENY: this.#div.classList.add(deny); break;
        }
    }

    #updateState() {
        this.#updateStateShared('', this.#state);
    }

    #updatePassiveState() {
        this.#updateStateShared('passive-', this.#passiveState);
    }
}

customElements.define("tri-state-checkbox", TriStateCheckbox);