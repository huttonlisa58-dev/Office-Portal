'use client';
import { useCallback, useEffect, useState } from 'react';
import { MessagesSquare, Send, Trash2, MessageCircle } from 'lucide-react';
import PageBanner from '@/components/PageBanner';
import Loader from '@/components/Loader';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { feed as api } from '@/lib/db';

const EMOJIS = ['👍', '❤️', '🎉', '👏', '😄'];
const ago = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};
const initials = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setPosts(await api.list(user?.id)); } catch { setPosts([]); } }, [user]);
  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try { await api.createPost({ company_id: user.company, author_id: user.id, body: body.trim() }); setBody(''); load(); }
    catch (e) { window.alert(e.message || 'Could not post'); } finally { setBusy(false); }
  };
  const react = async (postId, emoji) => { try { await api.toggleReaction({ company_id: user.company, post_id: postId, author_id: user.id, emoji }); load(); } catch (e) { window.alert(e.message); } };
  const removePost = async (id) => { if (!window.confirm('Delete this post?')) return; try { await api.deletePost(id); load(); } catch (e) { window.alert(e.message); } };

  return (
    <>
      <PageBanner icon={MessagesSquare} title="Company feed" />

      <div className="mx-auto max-w-2xl">
        <div className="card mb-5 p-4">
          <textarea className="input min-h-[72px] resize-none" placeholder="Share something with your team…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-2 flex justify-end">
            <button className="btn-primary inline-flex items-center gap-1.5" onClick={post} disabled={busy || !body.trim()}><Send size={15} /> Post</button>
          </div>
        </div>

        {posts === null ? <Loader /> : posts.length === 0 ? (
          <EmptyState title="No posts yet" subtitle="Be the first to share an update with your team." />
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p._id} post={p} user={user} onReact={react} onRemove={removePost} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PostCard({ post, user, onReact, onRemove, onChanged }) {
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState('');
  const canDelete = post.authorId === user?.id || ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role);

  const addComment = async () => {
    if (!text.trim()) return;
    try { await api.addComment({ company_id: user.company, post_id: post._id, author_id: user.id, body: text.trim() }); setText(''); onChanged(); }
    catch (e) { window.alert(e.message); }
  };
  const delComment = async (id) => { try { await api.deleteComment(id); onChanged(); } catch (e) { window.alert(e.message); } };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{initials(post.authorName)}</div>
          <div><div className="text-sm font-semibold">{post.authorName}</div><div className="text-[11px] text-slate-400">{ago(post.createdAt)}</div></div>
        </div>
        {canDelete && <button className="btn-ghost p-1.5 text-rose-500" title="Delete" onClick={() => onRemove(post._id)}><Trash2 size={15} /></button>}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {EMOJIS.map((e) => {
          const r = post.reactions.find((x) => x.emoji === e);
          return (
            <button key={e} onClick={() => onReact(post._id, e)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${r?.mine ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <span>{e}</span>{r?.count ? <span className="text-slate-500">{r.count}</span> : null}
            </button>
          );
        })}
        <button onClick={() => setShowComments((s) => !s)} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-sky-600">
          <MessageCircle size={14} /> {post.comments.length} comment{post.comments.length === 1 ? '' : 's'}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t pt-3 dark:border-slate-700">
          {post.comments.map((c) => (
            <div key={c._id} className="flex items-start gap-2 text-sm">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{initials(c.authorName)}</div>
              <div className="flex-1 rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold">{c.authorName}</span><span className="text-[10px] text-slate-400">{ago(c.createdAt)}</span></div>
                <div className="text-sm">{c.body}</div>
              </div>
              {(c.authorId === user?.id || ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR'].includes(user?.role)) && <button className="btn-ghost p-1 text-rose-400" onClick={() => delComment(c._id)}><Trash2 size={12} /></button>}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input className="input h-9 py-1" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }} />
            <button className="btn-primary px-3 py-1.5 text-sm" onClick={addComment} disabled={!text.trim()}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
