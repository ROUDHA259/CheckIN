import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  Plus,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  todayUAE,
  formatDate,
  formatTime,
  formatWeekday,
  formatDayMonth,
} from './sessions';
import './index.css';

console.log('Supabase URL exists:',
  Boolean(import.meta.env.VITE_SUPABASE_URL));

console.log('Supabase key exists:',
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY));

const STAFF_PATH = '/staff';

function Header({ staff = false }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="safe-x mx-auto flex max-w-4xl items-center justify-between gap-6 py-4 md:py-5">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight md:text-3xl">
            {staff ? 'إدارة جلسات المختبر' : 'تسجيل حضور الزوار'}
          </h1>
          {!staff && (
            <p className="mt-1 text-sm font-medium text-slate-500">
              {formatDate(todayUAE())}
            </p>
          )}
        </div>

        <img
          src="/logo.png"
          alt="شعار مشروع الذكاء الاصطناعي المساعد"
          className="h-auto w-[clamp(120px,28vw,220px)] object-contain"
        />
      </div>
      <div className="h-1 bg-gradient-to-l from-sky-300 via-blue-600 to-blue-800" />
    </header>
  );
}

function Message({ children, type = 'error' }) {
  if (!children) return null;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-5 py-3 text-sm font-semibold ${
        type === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-green-200 bg-green-50 text-green-700'
      }`}
    >
      {children}
    </div>
  );
}

function SummaryBanner({ entities, arrived, total, allSessions }) {
  const percent = total ? Math.round((arrived / total) * 100) : 0;

  return (
    <section className="flex items-center gap-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 px-5 py-4 text-white shadow-lg shadow-blue-200 md:gap-8 md:px-7">
      <div className="shrink-0">
        <p className="text-4xl font-extrabold leading-none md:text-5xl">
          {entities}
        </p>
        <p className="mt-2 text-xs font-medium text-blue-100 md:text-sm">
          الجهات — اليوم المحدد
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-baseline justify-between text-xs md:text-sm">
          <span className="font-medium text-blue-100">تم الحضور</span>
          <span dir="ltr" className="font-bold">
            {arrived} / {total}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="hidden shrink-0 border-s border-white/25 ps-6 sm:block">
        <p className="text-3xl font-extrabold leading-none">{allSessions}</p>
        <p className="mt-2 text-xs font-medium text-blue-100 md:text-sm">
          إجمالي الجلسات
        </p>
      </div>
    </section>
  );
}

function SessionCard({ session, entityName, busy, onArrive }) {
  const arrived = Boolean(session.arrived_at);

  return (
    <article
      className={`flex min-h-0 items-center gap-3 rounded-2xl border px-4 py-3 transition md:gap-4 ${
        arrived
          ? 'border-green-200 bg-green-50/70'
          : 'border-slate-200 bg-white shadow-sm hover:shadow-md'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white transition md:h-12 md:w-12 ${
          arrived
            ? 'bg-green-600'
            : 'bg-gradient-to-br from-blue-400 to-blue-700'
        }`}
      >
        {arrived ? <CheckCircle2 size={24} /> : entityName.trim().charAt(0)}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-base font-bold leading-snug md:text-lg">
          {entityName}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500 md:text-sm">
          <Clock3 size={14} />
          {formatTime(session.session_time)}
        </p>
      </div>

      <button
        type="button"
        aria-pressed={arrived}
        disabled={busy}
        onClick={onArrive}
        className={`focus-ring flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-5 text-sm font-bold text-white transition active:scale-95 ${
          arrived
            ? 'cursor-default bg-green-600'
            : 'bg-blue-700 shadow-md shadow-blue-200 hover:bg-blue-800'
        }`}
      >
        {arrived && <CheckCircle2 size={18} />}
        {arrived ? 'تم الحضور' : 'تسجيل الحضور'}
      </button>
    </article>
  );
}

const NEW_ENTITY = '__new__';

function AddSessionPanel({ entities, defaultDate, onCancel, onSaved }) {
  const [entityId, setEntityId] = useState('');
  const [newName, setNewName] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (saving || !supabase) return;

    const name = newName.trim();

    if (!entityId || (entityId === NEW_ENTITY && !name)) {
      setError('يرجى اختيار الجهة.');
      return;
    }

    setSaving(true);
    setError('');

    let id = entityId;

    if (entityId === NEW_ENTITY) {
      const { data, error: entityError } = await supabase
        .from('entities')
        .insert({ name_ar: name })
        .select('id')
        .single();

      if (entityError) {
        setError('تعذرت إضافة الجهة. تحقق من الصلاحيات.');
        setSaving(false);
        return;
      }

      id = data.id;
    }

    const { error: sessionError } = await supabase
      .from('lab_sessions')
      .insert({ entity_id: id, session_date: date, session_time: time });

    setSaving(false);

    if (sessionError) {
      setError(
        sessionError.code === '23505'
          ? 'توجد جلسة لهذه الجهة بنفس الموعد.'
          : 'تعذرت إضافة الجلسة. تحقق من الصلاحيات.'
      );
      return;
    }

    onSaved(date);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/60 sm:p-6"
    >
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <Plus size={20} className="text-blue-700" />
        إضافة جهة في موعد
      </h3>

      <div>
        <label className="mb-2 block text-sm font-bold">الجهة</label>
        <select
          className="field"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          required
        >
          <option value="">اختر الجهة</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name_ar}
            </option>
          ))}
          <option value={NEW_ENTITY}>+ جهة جديدة...</option>
        </select>
      </div>

      {entityId === NEW_ENTITY && (
        <input
          className="field"
          placeholder="اسم الجهة الجديدة"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold">
            <CalendarDays size={16} />
            التاريخ
          </label>
          <input
            type="date"
            className="field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Clock3 size={16} />
            الوقت
          </label>
          <input
            type="time"
            className="field"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      <Message>{error}</Message>

      <div className="flex gap-3">
        <button disabled={saving} className="primary-btn flex-1">
          {saving ? 'جارٍ الحفظ...' : 'إضافة'}
        </button>
        <button type="button" onClick={onCancel} className="secondary-btn">
          إلغاء
        </button>
      </div>
    </form>
  );
}

function VisitorApp() {
  const [entities, setEntities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const today = todayUAE();

  const loadData = useCallback(
    async (preferDate) => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const base = 'id, entity_id, session_date, session_time';

      const query = (fields) =>
        supabase
          .from('lab_sessions')
          .select(fields)
          .order('session_date')
          .order('session_time')
          .limit(500);

      const [entityResult, first] = await Promise.all([
        supabase.from('entities').select('id, name_ar').order('name_ar'),
        query(`${base}, arrived_at`),
      ]);

      // If the arrived_at column doesn't exist yet, still show the sessions
      const sessionResult = first.error ? await query(base) : first;

      if (entityResult.error || sessionResult.error) {
        setError('تعذّر تحميل حالة الحضور. راجع إعدادات قاعدة البيانات.');
        setLoading(false);
        return;
      }

      const list = sessionResult.data || [];
      setError('');
      setEntities(entityResult.data || []);
      setSessions(list);

      const dates = [...new Set(list.map((s) => s.session_date))];

      setSelectedDate((prev) =>
        preferDate ||
        (prev && dates.includes(prev) ? prev : '') ||
        (dates.includes(today)
          ? today
          : dates.find((d) => d > today) || dates[dates.length - 1] || '')
      );

      setLoading(false);
    },
    [today]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dates = useMemo(
    () => [...new Set(sessions.map((s) => s.session_date))],
    [sessions]
  );

  const daySessions = useMemo(
    () => sessions.filter((s) => s.session_date === selectedDate),
    [sessions, selectedDate]
  );

  const arrivedCount = useMemo(
    () => daySessions.filter((x) => x.arrived_at).length,
    [daySessions]
  );

  const dayEntitiesCount = useMemo(
    () => new Set(daySessions.map((s) => s.entity_id)).size,
    [daySessions]
  );

  const entityName = (id) =>
    entities.find((e) => e.id === id)?.name_ar || 'جهة غير معروفة';

  async function markArrived(session) {
    if (session.arrived_at || busyId || !supabase) return;

    setBusyId(session.id);
    setError('');

    // Turn green right away, undo if saving fails
    const stamp = new Date().toISOString();
    const update = (value) =>
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id ? { ...s, arrived_at: value } : s
        )
      );

    update(stamp);

    const { error: rpcError } = await supabase.rpc('mark_session_arrived', {
      p_session_id: session.id,
    });

    if (rpcError) {
      update(null);
      setError('تعذر تسجيل الحضور. حاول مرة أخرى.');
    }

    setBusyId(null);
  }

  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top_right,_#dbeafe,_#f8fafc_50%)] md:h-dvh md:overflow-hidden"
    >
      <Header />

      <main className="safe-x mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 py-4 md:py-5">
        {!isSupabaseConfigured && (
          <Message>يرجى إعداد الاتصال بقاعدة البيانات.</Message>
        )}

        <Message>{error}</Message>

        <SummaryBanner
          entities={dayEntitiesCount}
          arrived={arrivedCount}
          total={daySessions.length}
          allSessions={sessions.length}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
            role="tablist"
          >
            {dates.map((d) => {
              const active = d === selectedDate;
              return (
                <button
                  key={d}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedDate(d);
                    setError('');
                  }}
                  className={`focus-ring relative min-h-12 min-w-[92px] flex-1 rounded-xl px-3 py-1.5 text-center transition ${
                    active
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm font-extrabold md:text-base">
                    {formatWeekday(d)}
                  </span>
                  <span
                    className={`block text-xs ${
                      active ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {formatDayMonth(d)}
                  </span>
                  {d === today && (
                    <span
                      className={`absolute left-2 top-2 h-2 w-2 rounded-full ${
                        active ? 'bg-white' : 'bg-green-500'
                      }`}
                      title="اليوم"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            disabled={!supabase}
            className="focus-ring flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-6 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-white">
              <Plus size={16} />
            </span>
            إضافة جهة
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-500">جارٍ التحميل...</p>
        ) : daySessions.length === 0 ? (
          !error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 py-12 text-slate-400">
              <CalendarDays size={40} />
              <p className="font-semibold">لا توجد جلسات في هذا اليوم</p>
            </div>
          )
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto pb-1 md:[grid-auto-rows:minmax(72px,92px)]">
            {daySessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                entityName={entityName(session.entity_id)}
                busy={busyId === session.id}
                onArrive={() => markArrived(session)}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <AddSessionPanel
              entities={entities}
              defaultDate={selectedDate || today}
              onCancel={() => setShowAdd(false)}
              onSaved={(date) => {
                setShowAdd(false);
                loadData(date);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StaffApp() {
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [entities, setEntities] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [entityId, setEntityId] = useState('');
  const [date, setDate] = useState(todayUAE());
  const [time, setTime] = useState('10:00');
  const [names, setNames] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function verifyStaff(currentUser) {
    if (!currentUser || !supabase) {
      setUser(null);
      setAuthorized(false);
      setCheckingAuth(false);
      return;
    }

    const { data, error } = await supabase
      .from('staff_users')
      .select('user_id')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    setUser(currentUser);
    setAuthorized(!error && Boolean(data));
    setCheckingAuth(false);
  }

  useEffect(() => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      verifyStaff(data.user);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUser(null);
          setAuthorized(false);
          setCheckingAuth(false);
        } else {
          setUser(session.user);
          setCheckingAuth(true);
          verifyStaff(session.user);
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError('تعذر تسجيل الدخول. تحقق من البيانات.');

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setAuthorized(false);
  }

  async function loadStaffData() {
    if (!supabase) return;

    const [entityResult, sessionResult] = await Promise.all([
      supabase.from('entities').select('id, name_ar').order('name_ar'),
      supabase
        .from('lab_sessions')
        .select('id, entity_id, session_date, session_time')
        .order('session_date', { ascending: false })
        .limit(200),
    ]);

    if (entityResult.error || sessionResult.error) {
      setError('تعذر تحميل بيانات الجلسات.');
      return;
    }

    setEntities(entityResult.data || []);
    setSessions(sessionResult.data || []);
  }

  useEffect(() => {
    if (authorized) loadStaffData();
  }, [authorized]);

  async function addSession(event) {
    event.preventDefault();
    if (loading) return;

    if (!entityId || !date || !time) {
      setError('يرجى اختيار الجهة والتاريخ والوقت.');
      return;
    }

    const visitorNames = [
      ...new Set(
        names
          .split('\n')
          .map(name => name.trim())
          .filter(Boolean)
      ),
    ];

    if (visitorNames.length === 0) {
      setError('يرجى إدخال اسم زائر واحد على الأقل.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    const { data: session, error: sessionError } = await supabase
      .from('lab_sessions')
      .insert({
        entity_id: entityId,
        session_date: date,
        session_time: time,
      })
      .select('id')
      .single();

    if (sessionError) {
      setError('تعذر إضافة الجلسة. ربما توجد جلسة بنفس الموعد.');
      setLoading(false);
      return;
    }

    const { error: visitorError } = await supabase
      .from('session_visitors')
      .insert(
        visitorNames.map(visitor_name => ({
          session_id: session.id,
          visitor_name,
        }))
      );

    if (visitorError) {
      setError(
        'تم إنشاء الجلسة، لكن تعذرت إضافة بعض الأسماء. راجع قاعدة البيانات قبل إعادة المحاولة.'
      );
    } else {
      setNotice('تمت إضافة الجلسة والزوار بنجاح.');
      setNames('');
    }

    await loadStaffData();
    setLoading(false);
  }

  const entityName = id =>
    entities.find(entity => entity.id === id)?.name_ar || 'جهة غير معروفة';

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-slate-50">
      <Header staff />

      <main className="safe-x mx-auto max-w-5xl py-8">
        {checkingAuth ? (
          <p className="text-center">جارٍ التحقق من الحساب...</p>
        ) : !user ? (
          <section className="panel mx-auto max-w-md p-7">
            <div className="mb-6 text-center">
              <LogIn className="mx-auto mb-3 text-blue-700" size={36} />
              <h2 className="text-xl font-extrabold">
                دخول فريق المختبر
              </h2>
            </div>

            <form onSubmit={login} className="space-y-4">
              <input
                type="email"
                className="field"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                className="field"
                placeholder="كلمة المرور"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <Message>{error}</Message>

              <button
                disabled={loading || !supabase}
                className="primary-btn w-full"
              >
                تسجيل الدخول
              </button>
            </form>
          </section>
        ) : !authorized ? (
          <section className="panel mx-auto max-w-lg space-y-4 p-7 text-center">
            <h2 className="text-xl font-bold">
              هذا الحساب غير مصرح له بإدارة الجلسات
            </h2>
            <p className="text-sm text-slate-500">
              يرجى التواصل مع مسؤول النظام.
            </p>
            <button onClick={logout} className="secondary-btn">
              تسجيل الخروج
            </button>
          </section>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold">
                إدارة الجلسات
              </h2>
              <button
                onClick={logout}
                className="secondary-btn flex items-center gap-2"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>

            <section className="panel mb-7 p-6">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-extrabold">
                <Plus size={20} className="text-blue-700" />
                إضافة جلسة جديدة
              </h3>

              <form onSubmit={addSession} className="space-y-5">
                <div>
                  <label className="mb-2 block font-bold">
                    الجهة
                  </label>
                  <select
                    className="field"
                    value={entityId}
                    onChange={e => setEntityId(e.target.value)}
                    required
                  >
                    <option value="">اختر الجهة</option>
                    {entities.map(entity => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 font-bold">
                      <CalendarDays size={18} />
                      التاريخ
                    </label>
                    <input
                      type="date"
                      className="field"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 font-bold">
                      <Clock3 size={18} />
                      الوقت
                    </label>
                    <input
                      type="time"
                      className="field"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-bold">
                    أسماء الزوار
                  </label>
                  <textarea
                    className="field min-h-36 resize-y"
                    placeholder={'أحمد محمد\nفاطمة علي\nمحمد عبدالله'}
                    value={names}
                    onChange={e => setNames(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    أدخل اسم كل زائر في سطر منفصل.
                  </p>
                </div>

                <Message>{error}</Message>
                <Message type="success">{notice}</Message>

                <button disabled={loading} className="primary-btn w-full">
                  {loading ? 'جارٍ الحفظ...' : 'إضافة الجلسة والزوار'}
                </button>
              </form>
            </section>

            <section className="panel p-6">
              <h3 className="mb-5 text-lg font-extrabold">
                الجلسات المجدولة
              </h3>

              {sessions.length === 0 ? (
                <p className="text-slate-500">
                  لا توجد جلسات حتى الآن.
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {entityName(session.entity_id)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(session.session_date)}
                        </p>
                      </div>

                      <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">
                        {formatTime(session.session_time)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  const isStaff = window.location.pathname.replace(/\/$/, '') === STAFF_PATH;
  return isStaff ? <StaffApp /> : <VisitorApp />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);