import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PERSON_NAMES_AR, SESSIONS } from './sessions';
import { isSupabaseConfigured, supabase } from './supabase';
import './index.css';

const weekdays = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const months = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const dates = [...new Set(SESSIONS.map(({ date }) => date))].sort();

const allEmails = (session) => [session.email, ...session.guests];

const isChecked = (state, email) => Boolean(state[email]);

const arabicDigits = (value) => String(value);

const personName = (email) => PERSON_NAMES_AR[email] || 'زائر';

const formatTime = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  const hour12 = ((hour + 11) % 12) + 1;
  const period = hour >= 12 ? 'م' : 'ص';

  return arabicDigits(
    `${hour12}:${String(minute).padStart(2, '0')} ${period}`,
  );
};

const formatDay = (value) => {
  const date = new Date(`${value}T00:00:00`);

  return {
    weekday: weekdays[date.getDay()],
    label: `${arabicDigits(date.getDate())} ${months[date.getMonth()]}`,
  };
};

const initial = (value) => value.replace(/^ال/, '').trim()[0] || 'ز';

function Stat({ value, label, accent = false }) {
  return (
    <div
      className={`min-h-[116px] rounded-2xl border p-5 ${
        accent
          ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-lg shadow-blue-200'
          : 'border-slate-200 bg-white'
      }`}
    >
      <strong
        className={`block text-3xl font-extrabold tracking-tight ${
          accent ? '' : 'text-blue-800'
        }`}
      >
        {arabicDigits(value)}
      </strong>

      <span
        className={`mt-2 block text-xs leading-5 ${
          accent ? 'text-blue-100' : 'text-slate-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function App() {
  const [checkins, setCheckins] = useState({});
  const [activeDate, setActiveDate] = useState(dates[0]);
  const [openSessions, setOpenSessions] = useState(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    const loadCheckins = async () => {
      const { data, error: loadError } = await supabase
        .from('checkins')
        .select('email, arrived');

      if (loadError) {
        setError(
          'تعذّر تحميل حالة الحضور. راجع إعدادات قاعدة البيانات.',
        );
        return;
      }

      setCheckins(
        Object.fromEntries(
          data.map(({ email, arrived }) => [email, arrived]),
        ),
      );
    };

    loadCheckins();

    const channel = supabase
      .channel('checkins-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
        },
        (payload) => {
          if (!payload.new?.email) return;

          setCheckins((current) => ({
            ...current,
            [payload.new.email]: payload.new.arrived,
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleOrganization = async (session) => {
    const emails = allEmails(session);

    const nextStatus = !emails.every((email) =>
      isChecked(checkins, email),
    );

    const previousStatus = Object.fromEntries(
      emails.map((email) => [email, checkins[email]]),
    );

    setCheckins((current) => ({
      ...current,
      ...Object.fromEntries(
        emails.map((email) => [email, nextStatus]),
      ),
    }));

    setError('');

    if (!supabase) {
      setError(
        'وضع المعاينة فقط — أضف بيانات الاتصال بقاعدة البيانات لحفظ التغييرات ومزامنتها.',
      );
      return;
    }

    const updatedAt = new Date().toISOString();

    const { error: saveError } = await supabase
      .from('checkins')
      .upsert(
        emails.map((email) => ({
          email,
          arrived: nextStatus,
          updated_at: updatedAt,
        })),
        {
          onConflict: 'email',
        },
      );

    if (saveError) {
      setCheckins((current) => ({
        ...current,
        ...Object.fromEntries(
          emails.map((email) => [
            email,
            previousStatus[email] ?? false,
          ]),
        ),
      }));

      setError('لم يتم حفظ التغيير. حاول مرة أخرى.');
    }
  };

  const selectedSessions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return SESSIONS.filter(
      (session) => session.date === activeDate,
    )
      .filter((session) => {
        if (!term) return true;

        const searchableValues = [
          session.orgAr,
          ...allEmails(session).map(personName),
        ];

        return searchableValues.some((value) =>
          value?.toLocaleLowerCase().includes(term),
        );
      })
      .sort((first, second) =>
        first.time.localeCompare(second.time),
      );
  }, [activeDate, search]);

  const selectedDayOrganizations = new Set(
    SESSIONS.filter(
      ({ date }) => date === activeDate,
    ).map(({ orgAr }) => orgAr),
  ).size;

  const toggleSession = (id) => {
    setOpenSessions((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dbeafe_0,_#f8fafc_38rem)]">
<header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
  <div className="safe-x mx-auto max-w-6xl py-7 md:py-8">
    <div className="flex items-center justify-between gap-6">
      <h1 className="flex-1 text-right text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
        تسجيل حضور الزوار
      </h1>

      <img
        src="/logo.png"
        alt="مشروع الذكاء الاصطناعي المساعد لحكومة دولة الإمارات"
        className="h-auto w-[clamp(190px,40vw,430px)] shrink-0 object-contain"
      />
    </div>
  </div>
</header>

      <main className="safe-x mx-auto max-w-6xl py-7 md:py-10">
        {!isSupabaseConfigured && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            وضع المعاينة: أضف بيانات الاتصال بقاعدة البيانات
            لتفعيل الحفظ والمزامنة المباشرة.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            value={selectedDayOrganizations}
            label="الجهات — اليوم المحدد"
            accent
          />

          <Stat
            value={dates.length}
            label="أيام التقييمات"
          />

          <Stat
            value={SESSIONS.length}
            label="إجمالي الجلسات"
          />
        </section>

        <section className="mt-8">
         

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
            {dates.map((date) => {
              const { weekday, label } = formatDay(date);
              const active = date === activeDate;

              return (
                <button
                  key={date}
                  onClick={() => setActiveDate(date)}
                  className={`focus-ring min-h-14 min-w-28 shrink-0 touch-manipulation rounded-xl border px-3 py-3 text-center transition md:min-w-0 ${
                    active
                      ? 'border-blue-700 bg-blue-700 text-white shadow-md shadow-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {weekday}
                  </span>

                  <span
                    className={`mt-1 block text-[11px] ${
                      active
                        ? 'text-blue-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 space-y-3">
          {selectedSessions.length === 0 && (
            <div className="panel px-6 py-16 text-center text-sm text-slate-500">
              لا يوجد زوار مطابقون لهذا البحث في اليوم المحدد.
            </div>
          )}

          {selectedSessions.map((session) => {
            const open = openSessions.has(session.id);
            const emails = allEmails(session);

            const organizationArrived = emails.every((email) =>
              isChecked(checkins, email),
            );

            return (
              <article
                key={session.id}
                className="panel overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className="flex min-h-[84px] cursor-pointer items-center gap-3 p-4 sm:gap-4 sm:p-5 md:min-h-[92px] md:px-6"
                  onClick={() => toggleSession(session.id)}
                >
                  <div
                    className="w-[4.5rem] shrink-0 rounded-xl bg-blue-50 px-2 py-2.5 text-center text-xs font-extrabold text-blue-800"
                    dir="ltr"
                  >
                    {formatTime(session.time)}
                  </div>

                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-800 text-sm font-bold text-white sm:flex">
                    {initial(session.orgAr)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                      {session.orgAr}
                    </h2>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleOrganization(session);
                      }}
                      className={`focus-ring min-h-11 touch-manipulation rounded-full px-4 py-2 text-[11px] font-bold transition sm:text-xs ${
                        organizationArrived
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                      }`}
                    >
                      {organizationArrived
                        ? 'تم الحضور'
                        : 'تسجيل وصول الجهة'}
                    </button>

                    <svg
                      className={`h-5 w-5 text-slate-400 transition ${
                        open ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 md:px-6">
                    {emails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center gap-3 border-b border-dashed border-slate-200 py-3 last:border-0"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                          {personName(email)[0]}
                        </div>

                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                          {personName(email)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>

      
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);