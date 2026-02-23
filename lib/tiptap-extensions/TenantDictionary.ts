import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * TenantDictionary Extension
 * Marks words as "Authorized" by the tenant.
 * Authorized words will not have native spellcheck red underlines.
 */
export const TenantDictionary = Mark.create({
    name: 'tenantDictionary',

    addAttributes() {
        return {
            'spellcheck': {
                default: 'false',
                parseHTML: element => element.getAttribute('spellcheck'),
                renderHTML: attributes => ({
                    'spellcheck': attributes.spellcheck,
                }),
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="authorized-word"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'authorized-word',
                'class': 'authorized-word-hint border-b border-dotted border-emerald-500/30'
            }),
            0
        ]
    },
})
