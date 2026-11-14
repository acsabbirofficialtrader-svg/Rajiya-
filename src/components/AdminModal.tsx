import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Music,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { Birthday1RawInput, CardConfigPayload, ReplyEntry } from '../data/cardDefaults';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  onCardUpdated: (card: CardConfigPayload) => void;
}

type TabKey = 'basic' | 'photos' | 'letter' | 'notes' | 'settings';

const TOKEN_STORAGE_KEY = 'b1_admin_token';

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AdminModal({ open, onClose, onCardUpdated }: AdminModalProps) {
  const [token, setToken] = useState<string>(() => sessionStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [loadingState, setLoadingState] = useState(false);
  const [draft, setDraft] = useState<CardConfigPayload | null>(null);
  const [replies, setReplies] = useState<ReplyEntry[]>([]);
  const [editLang, setEditLang] = useState<'bn' | 'en'>('bn');
  const [syncShared, setSyncShared] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoadingState(true);
    fetch('/api/admin/state', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          if (!cancelled) {
            setToken('');
            setDraft(null);
          }
          return;
        }
        const data = (await res.json()) as { card: CardConfigPayload; replies: ReplyEntry[] };
        if (!cancelled) {
          setDraft(data.card);
          setReplies(data.replies || []);
        }
      })
      .catch(() => {
        if (!cancelled) setToast({ type: 'err', text: 'ডাটা লোড করা যায়নি' });
      })
      .finally(() => {
        if (!cancelled) setLoadingState(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  if (!open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim() || loggingIn) return;
    setLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      if (!res.ok) {
        setAuthError('পাসকোড সঠিক নয়');
        return;
      }
      const data = (await res.json()) as { token: string };
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setPasscode('');
    } catch {
      setAuthError('সংযোগে সমস্যা হয়েছে');
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setDraft(null);
  }

  function updateLangInput(updater: (prev: Birthday1RawInput) => Birthday1RawInput) {
    setDraft((prev) => {
      if (!prev) return prev;
      const updated = updater(prev[editLang]);
      const otherLang = editLang === 'bn' ? 'en' : 'bn';
      let other = prev[otherLang];
      if (syncShared) {
        other = {
          ...other,
          to: updated.to,
          from: updated.from,
          birthday: updated.birthday,
          age: updated.age,
          togetherSince: updated.togetherSince,
          register: updated.register,
          mic: updated.mic,
          petals: updated.petals,
        };
      }
      return {
        ...prev,
        [editLang]: updated,
        [otherLang]: other,
      };
    });
  }

  async function uploadFile(file: File): Promise<string | null> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filename: file.name, dataUrl }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Upload failed');
    }
    const json = (await res.json()) as { url: string };
    return json.url;
  }

  async function handlePhotoUpload(idx: number, file: File | undefined) {
    if (!file || !draft) return;
    setUploadingKey(`photo-${idx}`);
    try {
      const url = await uploadFile(file);
      if (url) {
        setDraft((prev) => {
          if (!prev) return prev;
          const nextPhotos = [...prev.photos];
          nextPhotos[idx] = url;
          return { ...prev, photos: nextPhotos };
        });
        setToast({ type: 'ok', text: 'ছবি আপলোড হয়েছে! সেভ করতে ভুলবেন না।' });
      }
    } catch (err) {
      setToast({ type: 'err', text: err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ হয়েছে' });
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleAudioUpload(file: File | undefined) {
    if (!file || !draft) return;
    setUploadingKey('audio');
    try {
      const url = await uploadFile(file);
      if (url) {
        setDraft((prev) => (prev ? { ...prev, music: { ...prev.music, src: url } } : prev));
        setToast({ type: 'ok', text: 'গান আপলোড হয়েছে! সেভ করতে ভুলবেন না।' });
      }
    } catch (err) {
      setToast({ type: 'err', text: err instanceof Error ? err.message : 'গান আপলোড ব্যর্থ হয়েছে' });
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSave() {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/card', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = (await res.json()) as { card: CardConfigPayload };
      setDraft(data.card);
      onCardUpdated(data.card);
      setToast({ type: 'ok', text: 'সব পরিবর্তন সফলভাবে সেভ ও লাইভ হয়েছে!' });
    } catch {
      setToast({ type: 'err', text: 'সেভ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন' });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reset failed');
      const data = (await res.json()) as { card: CardConfigPayload };
      setDraft(data.card);
      onCardUpdated(data.card);
      setToast({ type: 'ok', text: 'ডিফল্ট ডেমো তথ্য ফিরে এসেছে' });
    } catch {
      setToast({ type: 'err', text: 'রিসেট করা যায়নি' });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePasscode(e: React.FormEvent) {
    e.preventDefault();
    if (!curPass || newPass.trim().length < 4 || changingPass) return;
    setChangingPass(true);
    try {
      const res = await fetch('/api/admin/passcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPasscode: curPass, newPasscode: newPass.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setToast({ type: 'err', text: err.error || 'পাসকোড পরিবর্তন করা যায়নি' });
        return;
      }
      setCurPass('');
      setNewPass('');
      setToast({ type: 'ok', text: 'নতুন পাসকোড সেভ হয়েছে!' });
    } catch {
      setToast({ type: 'err', text: 'সংযোগে সমস্যা হয়েছে' });
    } finally {
      setChangingPass(false);
    }
  }

  async function handleDeleteReply(id: string) {
    try {
      const res = await fetch(`/api/admin/replies/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { replies: ReplyEntry[] };
        setReplies(data.replies);
      }
    } catch {
      // ignore
    }
  }

  function copyShareLink() {
    const cleanUrl = `${window.location.origin}/`;
    navigator.clipboard?.writeText(cleanUrl).then(() => {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  const currentInput = draft?.[editLang];

  function addMemory() {
    if (!draft || draft[editLang].memories.length >= 8) return;
    const defaultImg = draft.photos[draft[editLang].memories.length % 4] || '/assets/birthday_1/memory-1.jpg';
    const nextPhotos = [...draft.photos];
    const idx = draft[editLang].memories.length;
    if (!nextPhotos[idx]) nextPhotos[idx] = defaultImg;
    setDraft((prev) => {
      if (!prev) return prev;
      const item = { caption: editLang === 'bn' ? 'নতুন স্মৃতি' : 'A new memory', date: todayIso() };
      return {
        ...prev,
        photos: nextPhotos,
        bn: editLang === 'bn' || syncShared ? { ...prev.bn, memories: [...prev.bn.memories, item] } : prev.bn,
        en: editLang === 'en' || syncShared ? { ...prev.en, memories: [...prev.en.memories, item] } : prev.en,
      };
    });
  }

  function removeMemory(idx: number) {
    if (!draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const nextPhotos = prev.photos.filter((_, i) => i !== idx);
      return {
        ...prev,
        photos: nextPhotos,
        bn:
          editLang === 'bn' || syncShared
            ? { ...prev.bn, memories: prev.bn.memories.filter((_, i) => i !== idx) }
            : prev.bn,
        en:
          editLang === 'en' || syncShared
            ? { ...prev.en, memories: prev.en.memories.filter((_, i) => i !== idx) }
            : prev.en,
      };
    });
  }

  function moveMemory(idx: number, dir: -1 | 1) {
    if (!draft) return;
    const target = idx + dir;
    if (target < 0 || target >= draft[editLang].memories.length) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const swap = <T,>(arr: T[]): T[] => {
        const copy = [...arr];
        if (copy[idx] !== undefined && copy[target] !== undefined) {
          [copy[idx], copy[target]] = [copy[target], copy[idx]];
        }
        return copy;
      };
      return {
        ...prev,
        photos: swap(prev.photos),
        bn: editLang === 'bn' || syncShared ? { ...prev.bn, memories: swap(prev.bn.memories) } : prev.bn,
        en: editLang === 'en' || syncShared ? { ...prev.en, memories: swap(prev.en.memories) } : prev.en,
      };
    });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Panel"
    >
      {!token ? (
        <div className="w-full max-w-sm rounded-2xl border border-[#e3d2b4] bg-[#fbf5ea] p-6 text-[#4a1020] shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a1020] text-[#f6eddc]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">অ্যাডমিন প্রবেশ</h2>
                <p className="text-xs text-[#6b4c44]">শুধুমাত্র অনুমোদিত ব্যবহারকারীর জন্য</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#6b4c44] hover:bg-[#efe3cd]"
              aria-label="বন্ধ করুন"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#4a1020]" htmlFor="admin-pass">
                পাসকোড
              </label>
              <div className="relative">
                <input
                  id="admin-pass"
                  type={showPass ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="অ্যাডমিন পাসকোড লিখুন"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3.5 pr-11 text-sm text-[#4a1020] outline-none focus:border-[#8e1f33]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-[#6b4c44] hover:bg-[#f6eddc]"
                  aria-label={showPass ? 'লুকান' : 'দেখুন'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {authError && <p className="text-sm font-medium text-[#a3281f]">{authError}</p>}

            <button
              type="submit"
              disabled={loggingIn || !passcode.trim()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5a1424] px-4 text-sm font-medium text-[#f6e2b8] transition hover:bg-[#4a1020] disabled:opacity-50"
            >
              {loggingIn ? 'যাচাই হচ্ছে…' : 'প্রবেশ করুন'}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#d6c2a3] bg-[#fbf5ea] text-[#4a1020] shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5d6bd] bg-[#f6eddc] px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-base font-semibold sm:text-lg">বার্থডে কার্ড অ্যাডমিন</h2>
              <p className="text-xs text-[#6b4c44]">নাম, ছবি, ক্যাপশন, চিঠি ও উপহার কাস্টমাইজ করুন</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyShareLink}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-[#d6c2a3] bg-white px-3 text-xs font-medium text-[#4a1020] hover:bg-[#efe3cd]"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'লিংক কপি হয়েছে' : 'শেয়ার লিংক'}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#5a1424] px-4 text-xs font-medium text-[#f6e2b8] hover:bg-[#4a1020] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'সেভ হচ্ছে…' : 'সেভ ও লাইভ করুন'}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title="লগআউট"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6c2a3] bg-white text-[#6b4c44] hover:bg-[#efe3cd]"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="বন্ধ করুন"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6c2a3] bg-white text-[#4a1020] hover:bg-[#efe3cd]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {toast && (
            <div
              className={`px-4 py-2 text-center text-xs font-medium sm:text-sm ${
                toast.type === 'ok' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}
            >
              {toast.text}
            </div>
          )}

          {/* Toolbar: Language + Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5d6bd] bg-white/70 px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['basic', 'মূল তথ্য'],
                  ['photos', 'ছবি ও ক্যাপশন'],
                  ['letter', 'চিঠি ও খাম'],
                  ['notes', 'চিরকুট ও উপহার'],
                  ['settings', `উত্তর (${replies.length}) ও সেটিংস`],
                ] as Array<[TabKey, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    activeTab === key
                      ? 'bg-[#4a1020] text-[#f6eddc]'
                      : 'bg-[#f6eddc] text-[#6b4c44] hover:bg-[#efe3cd]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#6b4c44]">কার্ডের ভাষা:</span>
                <div className="flex rounded-lg bg-[#efe3cd] p-0.5 text-xs">
                  {(['bn', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setEditLang(l)}
                      className={`min-h-[32px] rounded-md px-2.5 font-medium ${
                        editLang === l ? 'bg-white text-[#4a1020] shadow-sm' : 'text-[#6b4c44]'
                      }`}
                    >
                      {l === 'bn' ? 'বাংলা' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
              <label
                className="flex cursor-pointer items-center gap-1.5 text-xs text-[#6b4c44]"
                title="চালু থাকলে বাংলায় নাম, ছবি ও তারিখ বদলালে English ভার্সনেও একই থাকবে"
              >
                <input
                  type="checkbox"
                  checked={syncShared}
                  onChange={(e) => setSyncShared(e.target.checked)}
                  className="h-4 w-4 accent-[#5a1424]"
                />
                <span>নাম, ছবি ও তারিখ দুই ভাষায় এক রাখুন</span>
              </label>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loadingState || !draft || !currentInput ? (
              <div className="py-16 text-center text-sm text-[#6b4c44]">লোড হচ্ছে…</div>
            ) : (
              <>
                {activeTab === 'basic' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6b4c44]">
                        যার জন্মদিন (নাম) — {editLang === 'bn' ? 'বাংলা' : 'English'}
                      </label>
                      <input
                        type="text"
                        value={currentInput.to}
                        onChange={(e) => updateLangInput((p) => ({ ...p, to: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6b4c44]">
                        আপনার নাম (প্রেরক) — {editLang === 'bn' ? 'বাংলা' : 'English'}
                      </label>
                      <input
                        type="text"
                        value={currentInput.from}
                        onChange={(e) => updateLangInput((p) => ({ ...p, from: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[#6b4c44]">
                        উৎসর্গ লাইন (Dedication)
                      </label>
                      <input
                        type="text"
                        value={currentInput.dedication}
                        onChange={(e) => updateLangInput((p) => ({ ...p, dedication: e.target.value }))}
                        placeholder="যেমন: আমার প্রিয় মানুষটাকে"
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium text-[#6b4c44]">জন্মদিনের তারিখ</label>
                        <button
                          type="button"
                          onClick={() => updateLangInput((p) => ({ ...p, birthday: todayIso() }))}
                          className="text-xs font-medium text-[#8e1f33] underline"
                        >
                          আজকের তারিখ দিন
                        </button>
                      </div>
                      <input
                        type="date"
                        value={currentInput.birthday}
                        onChange={(e) => updateLangInput((p) => ({ ...p, birthday: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6b4c44]">বয়স (সংখ্যা, চাইলে ফাঁকা)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currentInput.age}
                        onChange={(e) => updateLangInput((p) => ({ ...p, age: e.target.value }))}
                        placeholder="25"
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6b4c44]">
                        একসাথে পথচলার শুরু (স্ট্যাম্প কাউন্টার)
                      </label>
                      <input
                        type="date"
                        value={currentInput.togetherSince}
                        onChange={(e) => updateLangInput((p) => ({ ...p, togetherSince: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6b4c44]">কথা বলার ধরন (তুমি / আপনি)</label>
                      <select
                        value={currentInput.register}
                        onChange={(e) =>
                          updateLangInput((p) => ({
                            ...p,
                            register: e.target.value === 'apni' ? 'apni' : 'tumi',
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-[#d6c2a3] bg-white px-3 text-sm"
                      >
                        <option value="tumi">তুমি (কাছের মানুষ / বন্ধু)</option>
                        <option value="apni">আপনি (সম্মানসূচক)</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-6 pt-2 sm:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={currentInput.mic}
                          onChange={(e) => updateLangInput((p) => ({ ...p, mic: e.target.checked }))}
                          className="h-4 w-4 accent-[#5a1424]"
                        />
                        <span>মাইক্রোফোনে ফুঁ দিয়ে মোমবাতি নেভানো চালু রাখুন</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={currentInput.petals}
                          onChange={(e) => updateLangInput((p) => ({ ...p, petals: e.target.checked }))}
                          className="h-4 w-4 accent-[#5a1424]"
                        />
                        <span>ঝরা গোলাপের পাপড়ি অ্যানিমেশন</span>
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'photos' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[#6b4c44]">
                        সর্বোচ্চ ৮টি স্মৃতির ছবি ও ক্যাপশন যোগ করতে পারবেন।
                      </p>
                      {currentInput.memories.length < 8 && (
                        <button
                          type="button"
                          onClick={addMemory}
                          className="flex h-10 items-center gap-1.5 rounded-xl bg-[#4a1020] px-3.5 text-xs font-medium text-[#f6eddc]"
                        >
                          <Plus className="h-4 w-4" />
                          <span>নতুন ছবি ও ক্যাপশন</span>
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {currentInput.memories.map((mem, idx) => {
                        const photoSrc = draft.photos[idx] || '';
                        return (
                          <div
                            key={idx}
                            className="flex flex-col gap-3 rounded-xl border border-[#e5d6bd] bg-white p-3.5 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[#e5d6bd] bg-[#f6eddc]">
                                {photoSrc ? (
                                  <img
                                    src={photoSrc}
                                    alt={mem.caption}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="flex flex-1 flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-[#8e1f33]">ছবি #{idx + 1}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveMemory(idx, -1)}
                                      disabled={idx === 0}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5d6bd] text-[#6b4c44] disabled:opacity-30"
                                      title="উপরে"
                                    >
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveMemory(idx, 1)}
                                      disabled={idx === currentInput.memories.length - 1}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5d6bd] text-[#6b4c44] disabled:opacity-30"
                                      title="নিচে"
                                    >
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeMemory(idx)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                                      title="মুছুন"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#f6eddc] px-3 text-xs font-medium text-[#4a1020] hover:bg-[#efe3cd]">
                                  <ImagePlus className="h-4 w-4" />
                                  <span>
                                    {uploadingKey === `photo-${idx}` ? 'আপলোড হচ্ছে…' : 'ছবি আপলোড করুন'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handlePhotoUpload(idx, e.target.files?.[0])}
                                  />
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-[#6b4c44]">ক্যাপশন</label>
                              <input
                                type="text"
                                value={mem.caption}
                                onChange={(e) =>
                                  updateLangInput((p) => {
                                    const next = [...p.memories];
                                    next[idx] = { ...next[idx], caption: e.target.value };
                                    return { ...p, memories: next };
                                  })
                                }
                                placeholder="ছবির ক্যাপশন লিখুন…"
                                className="h-10 w-full rounded-lg border border-[#d6c2a3] px-3 text-sm"
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs text-[#6b4c44]">স্মৃতির তারিখ</label>
                                <input
                                  type="date"
                                  value={mem.date}
                                  onChange={(e) =>
                                    updateLangInput((p) => {
                                      const next = [...p.memories];
                                      next[idx] = { ...next[idx], date: e.target.value };
                                      return { ...p, memories: next };
                                    })
                                  }
                                  className="h-10 w-full rounded-lg border border-[#d6c2a3] px-2 text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-[#6b4c44]">ছবির লিংক (ঐচ্ছিক)</label>
                                <input
                                  type="text"
                                  value={photoSrc}
                                  onChange={(e) =>
                                    setDraft((prev) => {
                                      if (!prev) return prev;
                                      const next = [...prev.photos];
                                      next[idx] = e.target.value;
                                      return { ...prev, photos: next };
                                    })
                                  }
                                  placeholder="https://..."
                                  className="h-10 w-full rounded-lg border border-[#d6c2a3] px-2 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'letter' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-[#8e1f33]">চিঠির লেখা ({editLang === 'bn' ? 'বাংলা' : 'English'})</h3>
                      <div>
                        <label className="mb-1 block text-xs text-[#6b4c44]">
                          চিঠির শুরুর লাইন (ফাঁকা রাখলে “প্রিয় {currentInput.to || '{to}'},” হবে)
                        </label>
                        <input
                          type="text"
                          value={currentInput.greeting}
                          onChange={(e) => updateLangInput((p) => ({ ...p, greeting: e.target.value }))}
                          placeholder={editLang === 'bn' ? 'প্রিয় {to},' : 'Dear {to},'}
                          className="h-10 w-full rounded-lg border border-[#d6c2a3] px-3 text-sm"
                        />
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#6b4c44]">অনুচ্ছেদসমূহ</span>
                          {currentInput.paragraphs.length < 8 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateLangInput((p) => ({ ...p, paragraphs: [...p.paragraphs, ''] }))
                              }
                              className="flex items-center gap-1 text-xs font-medium text-[#8e1f33]"
                            >
                              <Plus className="h-3.5 w-3.5" /> অনুচ্ছেদ যোগ করুন
                            </button>
                          )}
                        </div>
                        {currentInput.paragraphs.map((para, idx) => (
                          <div key={idx} className="flex gap-2">
                            <textarea
                              rows={3}
                              value={para}
                              onChange={(e) =>
                                updateLangInput((p) => {
                                  const next = [...p.paragraphs];
                                  next[idx] = e.target.value;
                                  return { ...p, paragraphs: next };
                                })
                              }
                              className="w-full rounded-lg border border-[#d6c2a3] p-2.5 text-sm"
                            />
                            {currentInput.paragraphs.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateLangInput((p) => ({
                                    ...p,
                                    paragraphs: p.paragraphs.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-200 text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-[#6b4c44]">বিদায় (Sign-off)</label>
                          <input
                            type="text"
                            value={currentInput.signoff}
                            onChange={(e) => updateLangInput((p) => ({ ...p, signoff: e.target.value }))}
                            placeholder={editLang === 'bn' ? 'তোমারই,' : 'Forever yours,'}
                            className="h-10 w-full rounded-lg border border-[#d6c2a3] px-3 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-[#6b4c44]">স্বাক্ষর (Signature)</label>
                          <input
                            type="text"
                            value={currentInput.signature}
                            onChange={(e) => updateLangInput((p) => ({ ...p, signature: e.target.value }))}
                            placeholder={editLang === 'bn' ? '{from}' : '{from}'}
                            className="h-10 w-full rounded-lg border border-[#d6c2a3] px-3 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#8e1f33]">আরও কয়েকটা খাম… (সর্বোচ্চ ৩টি)</h3>
                        {currentInput.openWhen.length < 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLangInput((p) => ({
                                ...p,
                                openWhen: [...p.openWhen, { title: '', text: '' }],
                              }))
                            }
                            className="flex items-center gap-1 text-xs font-medium text-[#8e1f33]"
                          >
                            <Plus className="h-3.5 w-3.5" /> খাম যোগ করুন
                          </button>
                        )}
                      </div>
                      {currentInput.openWhen.map((ow, idx) => (
                        <div key={idx} className="grid gap-2 rounded-lg border border-[#efe3cd] bg-[#fbf5ea] p-3 sm:grid-cols-[1fr_2fr_auto]">
                          <input
                            type="text"
                            value={ow.title}
                            onChange={(e) =>
                              updateLangInput((p) => {
                                const next = [...p.openWhen];
                                next[idx] = { ...next[idx], title: e.target.value };
                                return { ...p, openWhen: next };
                              })
                            }
                            placeholder="খামের শিরোনাম"
                            className="h-10 rounded-lg border border-[#d6c2a3] bg-white px-2.5 text-sm"
                          />
                          <input
                            type="text"
                            value={ow.text}
                            onChange={(e) =>
                              updateLangInput((p) => {
                                const next = [...p.openWhen];
                                next[idx] = { ...next[idx], text: e.target.value };
                                return { ...p, openWhen: next };
                              })
                            }
                            placeholder="ভেতরের লেখা"
                            className="h-10 rounded-lg border border-[#d6c2a3] bg-white px-2.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLangInput((p) => ({
                                ...p,
                                openWhen: p.openWhen.filter((_, i) => i !== idx),
                              }))
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#8e1f33]">ছোট্ট চিরকুট (রিবনে ঝোলানো — সর্বোচ্চ ৬টি)</h3>
                        {currentInput.notes.length < 6 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLangInput((p) => ({ ...p, notes: [...p.notes, { title: '', text: '' }] }))
                            }
                            className="flex items-center gap-1 text-xs font-medium text-[#8e1f33]"
                          >
                            <Plus className="h-3.5 w-3.5" /> চিরকুট যোগ করুন
                          </button>
                        )}
                      </div>
                      {currentInput.notes.map((n, idx) => (
                        <div key={idx} className="grid gap-2 rounded-lg border border-[#efe3cd] bg-[#fbf5ea] p-3 sm:grid-cols-[1fr_2fr_auto]">
                          <input
                            type="text"
                            value={n.title}
                            onChange={(e) =>
                              updateLangInput((p) => {
                                const next = [...p.notes];
                                next[idx] = { ...next[idx], title: e.target.value };
                                return { ...p, notes: next };
                              })
                            }
                            placeholder="শিরোনাম"
                            className="h-10 rounded-lg border border-[#d6c2a3] bg-white px-2.5 text-sm"
                          />
                          <input
                            type="text"
                            value={n.text}
                            onChange={(e) =>
                              updateLangInput((p) => {
                                const next = [...p.notes];
                                next[idx] = { ...next[idx], text: e.target.value };
                                return { ...p, notes: next };
                              })
                            }
                            placeholder="চিরকুটের লেখা"
                            className="h-10 rounded-lg border border-[#d6c2a3] bg-white px-2.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLangInput((p) => ({
                                ...p,
                                notes: p.notes.filter((_, i) => i !== idx),
                              }))
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#8e1f33]">উপহারের টিকিট (সর্বোচ্চ ৩টি)</h3>
                        {currentInput.coupons.length < 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLangInput((p) => ({ ...p, coupons: [...p.coupons, { title: '', text: '' }] }))
                            }
                            className="flex items-center gap-1 text-xs font-medium text-[#8e1f33]"
                          >
                            <Plus className="h-3.5 w-3.5" /> টিকিট যোগ করুন
                          </button>
                        )}
                      </div>
                      {currentInput.coupons.map((cp, idx) => (
                        <div key={idx} className="grid gap-2 rounded-lg border border-[#efe3cd] bg-[#fbf5ea] p-3 sm:grid-cols-[1fr_2fr_auto]">
                          <input
                            type="text"
                            value={cp.title}
                            onChange={(e) =>
                              updateLangInput((p) => {
                                const next = [...p.coupons];
                                next[idx] = { ...next[idx], title: e.target.value };
                                return { ...p, coupons: next };
                              })
                            }
                            placeholder="উপহারের নাম"
                            className="h-10 rounded-lg border border-[#d6c2a3] bg-white px-2.5 text-sm"
                          />
                          <input
                            type="text"
                            value={cp.text}
                            onChange={(e) =>
                              updateLangInput((p) => {
                                const next = [...p.coupons];
                                next[idx] = { ...next[idx], text: e.target.value };
                                return { ...p, coupons: next };
                              })
                            }
                            placeholder="ছোট্ট বর্ণনা"
                            className="h-10 rounded-lg border border-[#d6c2a3] bg-white px-2.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLangInput((p) => ({
                                ...p,
                                coupons: p.coupons.filter((_, i) => i !== idx),
                              }))
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    {/* Replies Inbox */}
                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#8e1f33]" />
                        <h3 className="text-sm font-semibold text-[#8e1f33]">
                          ফ্রেন্ডের পাঠানো উত্তর ({replies.length})
                        </h3>
                      </div>
                      {replies.length === 0 ? (
                        <p className="text-xs text-[#6b4c44]">
                          এখনো কোনো উত্তর আসেনি। আপনার বন্ধু কার্ডের “এবার তোমার পালা” অংশ থেকে লিখলে তা এখানে দেখাবে।
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {replies.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-[#efe3cd] bg-[#fbf5ea] p-3"
                            >
                              <div>
                                <p className="whitespace-pre-wrap text-sm text-[#4a1020]">{r.message}</p>
                                <p className="mt-1 text-xs text-[#6b4c44]">
                                  {new Date(r.createdAt).toLocaleString()} · {r.lang === 'bn' ? 'বাংলা' : 'EN'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteReply(r.id)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                                title="মুছুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Music */}
                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-[#8e1f33]" />
                          <h3 className="text-sm font-semibold text-[#8e1f33]">ব্যাকগ্রাউন্ড গান</h3>
                        </div>
                        <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#f6eddc] px-3 text-xs font-medium text-[#4a1020] hover:bg-[#efe3cd]">
                          <span>{uploadingKey === 'audio' ? 'আপলোড হচ্ছে…' : 'নতুন MP3 আপলোড'}</span>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => handleAudioUpload(e.target.files?.[0])}
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          type="text"
                          value={draft.music.title}
                          onChange={(e) =>
                            setDraft((p) => (p ? { ...p, music: { ...p.music, title: e.target.value } } : p))
                          }
                          placeholder="গানের নাম"
                          className="h-10 rounded-lg border border-[#d6c2a3] px-3 text-sm"
                        />
                        <input
                          type="text"
                          value={draft.music.artist}
                          onChange={(e) =>
                            setDraft((p) => (p ? { ...p, music: { ...p.music, artist: e.target.value } } : p))
                          }
                          placeholder="শিল্পী"
                          className="h-10 rounded-lg border border-[#d6c2a3] px-3 text-sm"
                        />
                        <input
                          type="text"
                          value={draft.music.credit}
                          onChange={(e) =>
                            setDraft((p) => (p ? { ...p, music: { ...p.music, credit: e.target.value } } : p))
                          }
                          placeholder="অ্যালবাম / ক্রেডিট"
                          className="h-10 rounded-lg border border-[#d6c2a3] px-3 text-sm"
                        />
                      </div>
                    </div>

                    {/* Security */}
                    <div className="rounded-xl border border-[#e5d6bd] bg-white p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-[#8e1f33]" />
                        <h3 className="text-sm font-semibold text-[#8e1f33]">পাসকোড পরিবর্তন</h3>
                      </div>
                      <form onSubmit={handleChangePasscode} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <input
                          type="password"
                          value={curPass}
                          onChange={(e) => setCurPass(e.target.value)}
                          placeholder="বর্তমান পাসকোড"
                          className="h-10 rounded-lg border border-[#d6c2a3] px-3 text-sm"
                        />
                        <input
                          type="password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          placeholder="নতুন পাসকোড (কমপক্ষে ৪ অক্ষর)"
                          className="h-10 rounded-lg border border-[#d6c2a3] px-3 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={changingPass || !curPass || newPass.trim().length < 4}
                          className="h-10 rounded-lg bg-[#4a1020] px-4 text-xs font-medium text-[#f6eddc] disabled:opacity-50"
                        >
                          {changingPass ? 'আপডেট হচ্ছে…' : 'পাসকোড বদলান'}
                        </button>
                      </form>
                    </div>

                    {/* Reset */}
                    <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-rose-900">ডিফল্ট ডেমোতে ফিরুন</h3>
                        <p className="text-xs text-rose-800/80">সব কাস্টম লেখা ও ছবি মুছে মূল টেমপ্লেট ফিরিয়ে আনবে</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={saving}
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 text-xs font-medium text-rose-800 hover:bg-rose-100"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>রিসেট</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
