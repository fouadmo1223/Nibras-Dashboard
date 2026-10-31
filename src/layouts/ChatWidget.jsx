import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { renderInlineMarkdown } from '@/lib/inline-markdown';
import { errorMessage } from '@/lib/api-errors';
import { useI18n } from '@/i18n/I18nProvider';
import { getChatbotStatus, sendChatMessage } from '@/services/chatbot.service';
import Button from '@/components/ui/Button';
import { inputClassName } from '@/components/ui/Input';

const PANEL_SPRING = { type: 'spring', stiffness: 420, damping: 32 };
const TYPE_SPEED_MS = 14;

/** Reveals `text` progressively, like it's being typed — purely a client-side presentation
 * effect (the reply itself already arrived in full; there's no token streaming from the API). */
function TypedText({ text, onDone }) {
  // `text` is immutable for a given mounted bubble (each message is appended once, never
  // edited), so this effect only ever needs to run once per instance.
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!text) return undefined;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const done = shown.length === text.length;
  return (
    <>
      {/* Markdown syntax (links/bold) only renders once the full text has arrived — mid-reveal
          it would show raw `[`/`**` characters, since a partial match can't be parsed yet. */}
      {done ? renderInlineMarkdown(shown) : shown}
      {!done ? <span className="ms-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" aria-hidden="true" /> : null}
    </>
  );
}

/** Three dots bouncing in sequence — shown while waiting for a reply. */
function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl bg-surface-muted px-3.5 py-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-foreground-subtle"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message, animateText, onTypedDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
        message.role === 'user'
          ? 'ms-auto rounded-ee-md bg-primary text-primary-foreground'
          : message.error
            ? 'rounded-es-md bg-error-soft text-error'
            : 'rounded-es-md bg-surface-muted text-foreground',
      )}
    >
      {animateText
        ? <TypedText text={message.content} onDone={onTypedDone} />
        : message.role === 'assistant' && !message.error
          ? renderInlineMarkdown(message.content)
          : message.content}
    </motion.div>
  );
}

/**
 * Floating chat widget, mounted once in AppShell so it's present on every admin page. Renders
 * nothing until `/chatbot/status` confirms OpenRouter is configured. Every dashboard route sits
 * behind RequireAuth, so the admin is always signed in here — no sign-in prompt needed, unlike
 * the website's guest-browsable widget. General support/FAQ only: no live platform-data tools.
 */
export default function ChatWidget() {
  const { t } = useI18n();
  const status = useQuery({ queryKey: ['chatbot', 'status'], queryFn: getChatbotStatus, staleTime: 10 * 60 * 1000 });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingId, setTypingId] = useState(null);
  const listRef = useRef(null);

  const send = useMutation({
    mutationFn: (nextMessages) => sendChatMessage(nextMessages),
    onSuccess: (data) => {
      const id = crypto.randomUUID();
      setTypingId(id);
      setMessages((prev) => [...prev, { id, role: 'assistant', content: data.reply }]);
    },
    onError: (error) => setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: errorMessage(error, t), error: true }]),
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, send.isPending]);

  if (!status.data?.configured) return null;

  const submit = (event) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || send.isPending) return;
    const next = [...messages, { id: crypto.randomUUID(), role: 'user', content }];
    setMessages(next);
    setInput('');
    send.mutate(next);
  };

  return (
    <div className="fixed bottom-5 end-5 z-50">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.14 } }}
            transition={PANEL_SPRING}
            className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-elevation-3 rtl:origin-bottom-left"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Sparkles size={14} aria-hidden="true" />
              </span>
              <p className="flex-1 font-medium text-foreground">{t('chatbot.title')}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('chatbot.close')}
                className="rounded-md p-1 text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? <p className="text-sm text-foreground-subtle">{t('chatbot.emptyState')}</p> : null}
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    animateText={message.role === 'assistant' && !message.error && message.id === typingId}
                    onTypedDone={() => setTypingId(null)}
                  />
                ))}
              </AnimatePresence>
              {send.isPending ? <TypingDots /> : null}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t('chatbot.placeholder')}
                className={cn(inputClassName, 'h-10')}
              />
              <Button type="submit" size="sm" disabled={!input.trim() || send.isPending} className="shrink-0 px-3">
                <Send size={16} />
              </Button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('chatbot.title')}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevation-2"
      >
        {!open ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary"
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.5, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="relative"
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
