import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import Markdown, { ASTNode, RenderRules } from 'react-native-markdown-display';

interface MarkdownNoteProps {
  content: string;
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // 1. Remove leading/trailing spaces per line to prevent Markdown code block false-positives
  md = md.split('\n').map(line => line.trim()).join('\n');

  // 2. Replace HTML tags
  md = md
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '\n- $1')
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<h1>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4>(.*?)<\/h4>/gi, '\n#### $1\n');

  // 3. Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // 4. Decode HTML entities
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  return md.trim();
}

export const MarkdownNote: React.FC<MarkdownNoteProps> = ({ content }) => {
  // Custom rules to wrap tables in a horizontal ScrollView
  const rules: RenderRules = {
    table: (node: ASTNode, children: React.ReactNode[], parent: ASTNode[], styles: any) => {
      return (
        <ScrollView horizontal style={localStyles.tableWrapper} key={node.key}>
          <View style={styles.table}>
            {children}
          </View>
        </ScrollView>
      );
    },
  };

  const processedContent = htmlToMarkdown(content);

  return (
    <ScrollView style={localStyles.container}>
      <Markdown rules={rules} style={markdownStyles}>
        {processedContent}
      </Markdown>
    </ScrollView>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  tableWrapper: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderRadius: 4,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
    color: '#1a1a1a',
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16,
    color: '#1a1a1a',
  },
  table: {
    borderWidth: 0, 
  },
  th: {
    padding: 8,
    backgroundColor: '#f6f8fa',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderColor: '#e1e4e8',
  },
  td: {
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#e1e4e8',
  },
  code_block: {
    backgroundColor: '#f6f8fa',
    padding: 10,
    borderRadius: 6,
    fontFamily: 'monospace',
  },
  code_inline: {
    backgroundColor: '#f6f8fa',
    padding: 4,
    borderRadius: 4,
    fontFamily: 'monospace',
  }
});
