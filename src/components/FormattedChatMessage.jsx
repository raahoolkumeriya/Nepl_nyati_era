import React from 'react';
import { ChevronRight, Sparkles, AlertCircle, Info, ExternalLink } from 'lucide-react';

/**
 * Parses inline markdown tokens:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - ~~strikethrough~~
 * - [label](url)
 */
export function renderInline(text) {
  if (!text) return null;

  // Regex to split on various markdown inline tokens
  // Order matters: links first, then bold, code, strikethrough, italic
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|~~[^~]+~~|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Link: [label](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, label, url] = match;
        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-cyan-300 hover:text-cyan-200 underline underline-offset-2 transition font-medium"
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-70" />
          </a>
        );
      }
    }

    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      const content = part.slice(2, -2);
      return (
        <strong key={idx} className="font-extrabold text-cyan-100 tracking-wide">
          {content}
        </strong>
      );
    }

    // Inline Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const content = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-900/90 text-cyan-300 font-mono text-[11px] sm:text-xs border border-cyan-500/30 shadow-inner"
        >
          {content}
        </code>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const content = part.slice(2, -2);
      return (
        <del key={idx} className="line-through text-slate-400 opacity-80">
          {content}
        </del>
      );
    }

    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      const content = part.slice(1, -1);
      return (
        <em key={idx} className="italic text-slate-200">
          {content}
        </em>
      );
    }

    // Regular plain text
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Parses multi-line markdown text into rich, user-friendly, readable JSX.
 */
export default function FormattedChatMessage({ content, isUser = false }) {
  if (!content) return null;

  // If it's a user message, render as clean clean-styled text without full markdown complexity
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let currentBlockType = null;
  let currentBlockLines = [];

  const flushBlock = () => {
    if (currentBlockLines.length === 0) return;

    if (currentBlockType === 'table') {
      blocks.push({ type: 'table', lines: [...currentBlockLines] });
    } else if (currentBlockType === 'ul') {
      blocks.push({ type: 'ul', lines: [...currentBlockLines] });
    } else if (currentBlockType === 'ol') {
      blocks.push({ type: 'ol', lines: [...currentBlockLines] });
    } else if (currentBlockType === 'blockquote') {
      blocks.push({ type: 'blockquote', lines: [...currentBlockLines] });
    } else if (currentBlockType === 'code') {
      blocks.push({ type: 'code', lines: [...currentBlockLines] });
    } else {
      // Paragraph or mixed lines
      blocks.push({ type: 'paragraph', lines: [...currentBlockLines] });
    }

    currentBlockLines = [];
    currentBlockType = null;
  };

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code fence toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushBlock();
        inCodeBlock = false;
      } else {
        flushBlock();
        inCodeBlock = true;
        currentBlockType = 'code';
      }
      continue;
    }

    if (inCodeBlock) {
      currentBlockLines.push(rawLine);
      continue;
    }

    // Empty line
    if (!trimmed) {
      flushBlock();
      continue;
    }

    // Heading lines
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushBlock();
      blocks.push({ type: 'heading', line: trimmed });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushBlock();
      blocks.push({ type: 'hr' });
      continue;
    }

    // Table line: starts and ends with | or contains |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      if (currentBlockType !== 'table') {
        flushBlock();
        currentBlockType = 'table';
      }
      currentBlockLines.push(trimmed);
      continue;
    }

    // Unordered list item (- item, * item, • item, + item)
    if (/^[-*+•]\s+/.test(trimmed)) {
      if (currentBlockType !== 'ul') {
        flushBlock();
        currentBlockType = 'ul';
      }
      currentBlockLines.push(trimmed);
      continue;
    }

    // Ordered list item (1. item, 2. item)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (currentBlockType !== 'ol') {
        flushBlock();
        currentBlockType = 'ol';
      }
      currentBlockLines.push(trimmed);
      continue;
    }

    // Blockquote (> text)
    if (trimmed.startsWith('>')) {
      if (currentBlockType !== 'blockquote') {
        flushBlock();
        currentBlockType = 'blockquote';
      }
      currentBlockLines.push(trimmed.replace(/^>\s*/, ''));
      continue;
    }

    // Standard paragraph line
    if (currentBlockType && currentBlockType !== 'paragraph') {
      flushBlock();
    }
    currentBlockType = 'paragraph';
    currentBlockLines.push(rawLine);
  }

  flushBlock();

  return (
    <div className="space-y-3 font-sans text-xs sm:text-sm leading-relaxed text-slate-200 select-text">
      {blocks.map((block, bIdx) => {
        // ── Headings ──
        if (block.type === 'heading') {
          const match = block.line.match(/^(#{1,6})\s+(.*)$/);
          if (!match) return null;
          const level = match[1].length;
          const text = match[2];

          if (level === 1) {
            return (
              <div key={bIdx} className="pt-2 pb-1 border-b border-cyan-500/25">
                <h1 className="text-base sm:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>{renderInline(text)}</span>
                </h1>
              </div>
            );
          }
          if (level === 2) {
            return (
              <h2 key={bIdx} className="text-sm sm:text-base font-extrabold text-cyan-200 pt-2 pb-0.5 flex items-center gap-1.5 border-b border-slate-800">
                <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                <span>{renderInline(text)}</span>
              </h2>
            );
          }
          if (level === 3) {
            return (
              <h3 key={bIdx} className="text-xs sm:text-sm font-bold text-cyan-300 pt-1.5 flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>{renderInline(text)}</span>
              </h3>
            );
          }
          return (
            <h4 key={bIdx} className="text-xs sm:text-sm font-bold text-slate-100 pt-1">
              {renderInline(text)}
            </h4>
          );
        }

        // ── Horizontal Rule ──
        if (block.type === 'hr') {
          return <hr key={bIdx} className="my-3 border-t border-cyan-500/20" />;
        }

        // ── Blockquote / Highlight Callout ──
        if (block.type === 'blockquote') {
          return (
            <div
              key={bIdx}
              className="my-2.5 p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-transparent border-l-4 border-cyan-400 shadow-sm"
            >
              <div className="flex items-start gap-2 text-cyan-100">
                <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  {block.lines.map((line, lIdx) => (
                    <p key={lIdx}>{renderInline(line)}</p>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // ── Code Block ──
        if (block.type === 'code') {
          return (
            <div key={bIdx} className="my-2.5 rounded-xl bg-[#050811] border border-cyan-500/25 p-3 overflow-x-auto shadow-inner">
              <pre className="font-mono text-xs text-cyan-300 leading-normal">
                {block.lines.join('\n')}
              </pre>
            </div>
          );
        }

        // ── Markdown Table ──
        if (block.type === 'table') {
          const rawRows = block.lines
            .map(line => line.split('|').map(cell => cell.trim()))
            .filter(row => row.length > 2); // Split of | a | b | yields ['', 'a', 'b', '']

          if (rawRows.length === 0) return null;

          // Header row is row 0
          const headerCells = rawRows[0].slice(1, -1);
          // Check if row 1 is separator (contains dashes)
          const hasSeparator = rawRows.length > 1 && rawRows[1].some(c => /^[-:\s]+$/.test(c));
          const dataRows = hasSeparator ? rawRows.slice(2) : rawRows.slice(1);

          return (
            <div key={bIdx} className="my-3 overflow-x-auto rounded-xl border border-cyan-500/30 bg-[#070b14]/80 shadow-md">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-cyan-950/50 border-b border-cyan-500/30 text-cyan-200">
                    {headerCells.map((th, thIdx) => (
                      <th key={thIdx} className="py-2 px-3 font-extrabold font-sans whitespace-nowrap">
                        {renderInline(th)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dataRows.map((row, rIdx) => {
                    const cells = row.slice(1, -1);
                    return (
                      <tr
                        key={rIdx}
                        className={rIdx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/40 hover:bg-cyan-950/20 transition'}
                      >
                        {cells.map((td, tdIdx) => (
                          <td key={tdIdx} className="py-2 px-3 text-slate-300 font-sans">
                            {renderInline(td)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        // ── Unordered List ──
        if (block.type === 'ul') {
          return (
            <ul key={bIdx} className="space-y-1.5 my-2">
              {block.lines.map((line, lIdx) => {
                const itemText = line.replace(/^[-*+•]\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0 shadow-[0_0_6px_#00f2fe]" />
                    <span className="flex-1">{renderInline(itemText)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // ── Ordered List ──
        if (block.type === 'ol') {
          return (
            <ol key={bIdx} className="space-y-1.5 my-2">
              {block.lines.map((line, lIdx) => {
                const match = line.match(/^(\d+)[.)]\s+(.*)$/);
                const num = match ? match[1] : `${lIdx + 1}`;
                const itemText = match ? match[2] : line;
                return (
                  <li key={lIdx} className="flex items-start gap-2.5 text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {num}
                    </span>
                    <span className="flex-1 pt-0.5">{renderInline(itemText)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // ── Standard Paragraph ──
        return (
          <div key={bIdx} className="space-y-1.5">
            {block.lines.map((line, lIdx) => (
              <p key={lIdx} className="leading-relaxed">
                {renderInline(line)}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
