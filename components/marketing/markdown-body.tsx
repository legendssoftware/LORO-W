import Link from 'next/link';

/** Lightweight markdown-ish renderer for blog posts (no extra deps). */
export function MarkdownBody({ content }: { content: string }) {
  const blocks = content.trim().split(/\n\n+/);

  return (
    <article className="prose prose-invert prose-zinc max-w-none font-body text-zinc-300 text-base leading-relaxed space-y-4">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={i}
              className="text-xl font-medium text-white mt-8 mb-2 scroll-mt-20"
            >
              {trimInline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('|')) {
          const rows = trimmed.split('\n').filter((r) => !r.match(/^\|[\s-|]+\|$/));
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full text-sm border border-white/10 rounded-lg">
                <tbody>
                  {rows.map((row, ri) => {
                    const cells = row
                      .split('|')
                      .slice(1, -1)
                      .map((c) => c.trim());
                    const Tag = ri === 0 ? 'th' : 'td';
                    return (
                      <tr key={ri} className="border-b border-white/10">
                        {cells.map((cell, ci) => (
                          <Tag
                            key={ci}
                            className={`px-3 py-2 text-left ${ri === 0 ? 'text-zinc-200 font-medium' : ''}`}
                          >
                            {trimInline(cell)}
                          </Tag>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        if (trimmed.match(/^\d+\.\s/)) {
          const items = trimmed.split(/\n/).map((line) => line.replace(/^\d+\.\s/, ''));
          return (
            <ol key={i} className="list-decimal list-inside space-y-2 pl-1">
              {items.map((item, j) => (
                <li key={j}>{trimInline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="text-zinc-300">
            {trimInline(trimmed)}
          </p>
        );
      })}
    </article>
  );
}

function trimInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={match.index} className="text-white font-medium">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isExternal = href.startsWith('http');
        parts.push(
          isExternal ? (
            <a
              key={match.index}
              href={href}
              className="text-purple-400 hover:text-purple-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          ) : (
            <Link
              key={match.index}
              href={href}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              {label}
            </Link>
          ),
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}
