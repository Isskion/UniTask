import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import Heading from '@tiptap/extension-heading'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import React from 'react'

export const FoldableHeading = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            folded: {
                default: false,
                parseHTML: element => element.getAttribute('data-folded') === 'true',
                renderHTML: attributes => {
                    if (!attributes.folded) {
                        return {}
                    }
                    return { 'data-folded': 'true' }
                },
            },
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(HeadingNodeView)
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('hideFoldedContent'),
                props: {
                    decorations(state) {
                        const doc = state.doc
                        const decorations: Decoration[] = []
                        let folding = false
                        let foldLevel: number | null = null

                        // Iterate over top-level nodes within the doc
                        doc.forEach((node, offset) => {
                            if (node.type.name === 'heading') {
                                const level = node.attrs.level

                                // Stop folding if we hit a heading of equal or higher level
                                // (e.g. if we are folding H2, an H1 or H2 will stop it. H3 will not).
                                if (folding && foldLevel !== null && level <= foldLevel) {
                                    folding = false
                                    foldLevel = null
                                }

                                // Start folding if this heading is folded
                                if (!folding && node.attrs.folded && (level === 1 || level === 2)) {
                                    folding = true
                                    foldLevel = level
                                }
                            } else if (folding) {
                                // If we are currently folding, hide the top-level block node
                                decorations.push(
                                    Decoration.node(offset, offset + node.nodeSize, {
                                        style: 'display: none;',
                                    })
                                )
                            }
                        })

                        return DecorationSet.create(doc, decorations)
                    },
                },
            }),
        ]
    },
})

const HeadingNodeView = (props: any) => {
    const { node, updateAttributes } = props
    const level = node.attrs.level
    const isFoldable = level === 1 || level === 2
    const isFolded = node.attrs.folded

    const Tag = `h${level}` as any

    return (
        <NodeViewWrapper className="relative group">
            {isFoldable && (
                <div
                    contentEditable={false}
                    className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground z-10 select-none"
                    onClick={() => updateAttributes({ folded: !isFolded })}
                    title={isFolded ? "Desplegar contenido" : "Ocultar contenido"}
                >
                    {isFolded ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                </div>
            )}
            <Tag>
                <NodeViewContent />
            </Tag>
        </NodeViewWrapper>
    )
}
