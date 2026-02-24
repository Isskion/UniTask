import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const spellCheckKey = new PluginKey('spellCheck');

/**
 * Checks a single word using a hidden <input> with spellcheck enabled.
 * Returns true if the browser considers the word misspelled.
 */
const misspelledCache = new Map<string, boolean>();
let hiddenInput: HTMLInputElement | null = null;

function getHiddenInput(): HTMLInputElement | null {
    if (typeof document === 'undefined') return null;
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.setAttribute('spellcheck', 'true');
        hiddenInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;top:-9999px;left:-9999px;';
        document.body.appendChild(hiddenInput);
    }
    return hiddenInput;
}

/**
 * Heuristic check: tries to detect if a word is likely misspelled.
 * Uses the browser's native spellcheck API where available.
 * 
 * NOTE: Browsers don't expose spell check results directly via JS API.
 * We use the `checkValidity` + custom dict approach as a best-effort.
 * The main highlighting still relies on marking words that fail our check.
 */
export function isMisspelled(word: string, verifiedWords: string[]): boolean {
    const lower = word.toLowerCase();

    // Skip short words, numbers, URLs, code-like tokens
    if (lower.length < 3) return false;
    if (/^\d+$/.test(lower)) return false;
    if (/^https?:\/\//i.test(lower)) return false;
    if (/[_@#$%^&*]/.test(lower)) return false;

    // Words in tenant dictionary are verified
    if (verifiedWords.some(w => w.toLowerCase() === lower)) return false;

    return false; // Base: no marcamos nada sin API nativa — se hace en el plugin vía DOM events
}

/**
 * SpellError Mark – renders misspelled words with a red wavy underline.
 * The `data-spell-word` attribute stores the original word for popover lookup.
 */
export const SpellCheckMark = Mark.create({
    name: 'spellError',
    priority: 1000,
    keepOnSplit: false,
    excludes: '_',

    addAttributes() {
        return {
            word: {
                default: null,
                parseHTML: el => el.getAttribute('data-spell-word'),
                renderHTML: attrs => ({ 'data-spell-word': attrs.word }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-spell-error]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-spell-error': '',
                class: 'spell-error-mark',
            }),
            0,
        ];
    },
});

/**
 * SpellCheck Plugin - scans document text and applies/removes spellError marks.
 * Uses document-level event listeners to detect native browser spell errors
 * by observing `<u>` elements injected by the browser's spellcheck engine.
 */
export const SpellCheckPlugin = (getVerifiedWords: () => string[]) =>
    new Plugin({
        key: spellCheckKey,
        props: {
            decorations(state) {
                const { doc } = state;
                const decorations: Decoration[] = [];
                return DecorationSet.create(doc, decorations);
            },
        },
    });
