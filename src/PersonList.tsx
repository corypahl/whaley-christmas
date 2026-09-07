import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Gift, Link2, LoaderCircle, Pencil, Plus, RefreshCw, ShoppingBag, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "./api";
import type { Person } from "./data";
import type { AmazonSource, WishItem } from "./types";

type ItemDraft = { title: string; details: string; url: string; price: string };
const emptyDraft: ItemDraft = { title: "", details: "", url: "", price: "" };

export function PersonList({ person }: { person: Person }) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [amazonSource, setAmazonSource] = useState<AmazonSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"item" | "amazon" | null>(null);
  const [editing, setEditing] = useState<WishItem | null>(null);

  const load = async () => {
    try {
      setError("");
      const data = await api.getList(person.slug);
      setItems(data.items);
      setAmazonSource(data.amazonSource);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load this list"); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); void load(); }, [person.slug]);

  const openAdd = () => { setEditing(null); setModal("item"); };
  const openEdit = (item: WishItem) => { setEditing(item); setModal("item"); };

  const remove = async (item: WishItem) => {
    if (!window.confirm(`Remove “${item.title || "this item"}” from the list?`)) return;
    try { await api.deleteItem(person.slug, item.id); setItems((current) => current.filter(({ id }) => id !== item.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not remove the item"); }
  };

  return (
    <main className="list-page">
      <header className="list-header">
        <Link to="/" className="back-link"><ArrowLeft size={18} /> All lists</Link>
        <div className="list-title-mark"><Gift size={24} /></div>
        <h1>{person.name}</h1>
      </header>

      <section className="list-content">
        <div className="toolbar">
          <div><span className="item-count">{items.length} {items.length === 1 ? "wish" : "wishes"}</span></div>
          <div className="toolbar-actions">
            <button className="button secondary" onClick={() => setModal("amazon")}><ShoppingBag size={17} /> Amazon list</button>
            <button className="button primary" onClick={openAdd}><Plus size={18} /> Add a wish</button>
          </div>
        </div>

        {amazonSource && (
          <div className="amazon-banner">
            <ShoppingBag size={20} />
            <div><strong>{amazonSource.last_error ? "Amazon link saved" : "Connected to Amazon"}</strong><span>{amazonSource.last_error ? "Sync needs attention" : amazonSource.last_synced_at ? `Last synced ${new Date(amazonSource.last_synced_at).toLocaleDateString()}` : "Ready to sync"}</span></div>
            <div className="amazon-actions"><a className="text-button" href={amazonSource.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open list</a><button className="text-button" onClick={() => setModal("amazon")}><RefreshCw size={15} /> Manage</button></div>
          </div>
        )}

        {error && <div className="error-banner">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X size={16} /></button></div>}

        {loading ? (
          <div className="state-card"><LoaderCircle className="spin" /><p>Gathering wishes…</p></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-gift"><Gift size={38} /></div>
            <h2>The list is waiting</h2>
            <p>Add the first wish, or bring in items from a public Amazon list.</p>
            <button className="button primary" onClick={openAdd}><Plus size={18} /> Add the first wish</button>
          </div>
        ) : (
          <div className="wish-grid">
            {items.map((item) => <WishCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => void remove(item)} />)}
          </div>
        )}
      </section>

      {modal === "item" && <ItemModal person={person} item={editing} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load(); }} />}
      {modal === "amazon" && <AmazonModal person={person} source={amazonSource} onClose={() => setModal(null)} onChanged={() => { setModal(null); void load(); }} />}
    </main>
  );
}

function WishCard({ item, onEdit, onDelete }: { item: WishItem; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="wish-card">
      <div className="wish-source">{item.source === "amazon" ? <><ShoppingBag size={14} /> Amazon</> : <><Gift size={14} /> Wish</>}</div>
      <h3>{item.title || "Untitled wish"}</h3>
      {item.details && <p className="wish-details">{item.details}</p>}
      <div className="wish-bottom">
        {item.price && <span className="price">{item.price}</span>}
        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="shop-link">View item <ExternalLink size={14} /></a>}
      </div>
      <div className="card-actions">
        <button onClick={onEdit} aria-label={`Edit ${item.title || "item"}`}><Pencil size={15} /></button>
        <button onClick={onDelete} aria-label={`Delete ${item.title || "item"}`}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function ItemModal({ person, item, onClose, onSaved }: { person: Person; item: WishItem | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<ItemDraft>(item ? { title: item.title || "", details: item.details || "", url: item.url || "", price: item.price || "" } : emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (item) await api.updateItem(person.slug, item.id, draft);
      else await api.addItem(person.slug, draft);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the wish"); setSaving(false); }
  };
  const update = (key: keyof ItemDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Modal title={item ? "Edit this wish" : "Add a wish"} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Title <span>optional</span><input autoFocus maxLength={160} value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="Cozy slippers" /></label>
        <label>Size, color, or details <span>optional</span><input maxLength={300} value={draft.details} onChange={(e) => update("details", e.target.value)} placeholder="Women’s 8, forest green" /></label>
        <label>Link <span>optional</span><div className="input-icon"><Link2 size={17} /><input type="url" value={draft.url} onChange={(e) => update("url", e.target.value)} placeholder="https://…" /></div></label>
        <label>Price <span>optional</span><input maxLength={40} value={draft.price} onChange={(e) => update("price", e.target.value)} placeholder="$24.99" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={18} /> : null}{item ? "Save changes" : "Add wish"}</button></div>
      </form>
    </Modal>
  );
}

function AmazonModal({ person, source, onClose, onChanged }: { person: Person; source: AmazonSource | null; onClose: () => void; onChanged: () => void }) {
  const [url, setUrl] = useState(source?.url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await api.importAmazon(person.slug, url); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not import this list"); setSaving(false); }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect this Amazon list? Imported wishes will stay on the page.")) return;
    setSaving(true);
    try { await api.removeAmazon(person.slug); onChanged(); } catch (err) { setError(err instanceof Error ? err.message : "Could not disconnect"); setSaving(false); }
  };
  return (
    <Modal title="Amazon wish list" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <p className="modal-copy">Paste a link to a <strong>public</strong> Amazon wish list. We’ll bring in the items we can find and remember the link for future syncing.</p>
        <label>Amazon list link<div className="input-icon"><ShoppingBag size={17} /><input autoFocus required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.amazon.com/hz/wishlist/ls/…" /></div></label>
        <p className="hint">Amazon occasionally limits automated access. If syncing is unavailable, the saved link will still be easy to open.</p>
        {source?.last_error && <p className="amazon-error"><strong>Last sync:</strong> {source.last_error}</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions split">{source ? <button type="button" className="button danger" onClick={() => void disconnect()} disabled={saving}>Disconnect</button> : <span />}<div><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving && <LoaderCircle className="spin" size={18} />}<RefreshCw size={17} /> {source ? "Sync now" : "Connect & import"}</button></div></div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X /></button></div>{children}</section></div>;
}
