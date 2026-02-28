import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType,
            unsetFontSize: () => ReturnType,
        },
        fontFamily: {
            setFontFamily: (font: string) => ReturnType,
            unsetFontFamily: () => ReturnType,
        }
    }
}

/**
 * FontSize Extension
 * Allows setting font size on text selections.
 */
export const FontSize = Mark.create({
    name: 'fontSize',

    addAttributes() {
        return {
            size: {
                default: null,
                parseHTML: element => element.style.fontSize,
                renderHTML: attributes => {
                    if (!attributes.size) {
                        return {};
                    }
                    return {
                        style: `font-size: ${attributes.size}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span',
                getAttrs: element => {
                    const fontSize = (element as HTMLElement).style.fontSize;
                    if (!fontSize) {
                        return false;
                    }
                    return { size: fontSize };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setFontSize: (size: string) => ({ chain }: { chain: any }) => {
                return chain()
                    .setMark('fontSize', { size })
                    .run();
            },
            unsetFontSize: () => ({ chain }: { chain: any }) => {
                return chain()
                    .unsetMark('fontSize')
                    .run();
            },
        } as any;
    },
});

/**
 * FontFamily Extension
 * Allows setting font family on text selections.
 */
export const FontFamily = Mark.create({
    name: 'fontFamily',

    addAttributes() {
        return {
            font: {
                default: 'Garamond',
                parseHTML: element => element.style.fontFamily,
                renderHTML: attributes => {
                    if (!attributes.font) {
                        return {};
                    }
                    return {
                        style: `font-family: ${attributes.font}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span',
                getAttrs: element => {
                    const fontFamily = (element as HTMLElement).style.fontFamily;
                    if (!fontFamily) {
                        return false;
                    }
                    return { font: fontFamily };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setFontFamily: (font: string) => ({ chain }: { chain: any }) => {
                return chain()
                    .setMark('fontFamily', { font })
                    .run();
            },
            unsetFontFamily: () => ({ chain }: { chain: any }) => {
                return chain()
                    .unsetMark('fontFamily')
                    .run();
            },
        } as any;
    },
});
