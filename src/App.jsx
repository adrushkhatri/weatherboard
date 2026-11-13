import { useState, useEffect, useCallback } from "react";
import { searchCities, getWeather } from "./api";
const mem = {};
const store = {
  get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return mem[k] ?? null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      mem[k] = v;
    }
  },
};
const lsOK = (() => {
  try {
    localStorage.setItem("wb:t", "1");
    localStorage.removeItem("wb:t");
    return true;
  } catch {
    return false;
  }
})();
const label = (c) => [c.name, c.region, c.country].filter(Boolean).join(", ");
const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
const notifOK = "Notification" in window && "serviceWorker" in navigator;
export default function App() {
  const [q, setQ] = useState(""),
    [sug, setSug] = useState([]),
    [sErr, setSErr] = useState(""),
    [sLoad, setSLoad] = useState(false),
    [fErr, setFErr] = useState("");
  const [city, setCity] = useState(() => store.get("wb:last")?.city || null),
    [wx, setWx] = useState(() => store.get("wb:last")?.wx || null);
  const [loading, setLoading] = useState(false),
    [err, setErr] = useState("");
  const [favs, setFavs] = useState(() => store.get("wb:favs") || []),
    [ask, setAsk] = useState(null),
    [note, setNote] = useState("");
  const [unit, setUnit] = useState(() => store.get("wb:unit") || "C"),
    [online, setOnline] = useState(navigator.onLine);
  const [rem, setRem] = useState(
      () => store.get("wb:rem") || { on: false, time: "07:30" },
    ),
    [why, setWhy] = useState(false),
    [perm, setPerm] = useState(
      notifOK ? Notification.permission : "unsupported",
    );
  const load = useCallback(async (c) => {
    setLoading(true);
    setErr("");
    try {
      const w = await getWeather(c);
      setWx(w);
      store.set("wb:last", { city: c, wx: w, ts: Date.now() });
    } catch (e) {
      setErr(e.message + (wx ? " Showing your last saved data." : ""));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (city && navigator.onLine) load(city);
  }, []);
  useEffect(() => {
    const a = () => setOnline(true),
      b = () => setOnline(false);
    addEventListener("online", a);
    addEventListener("offline", b);
    return () => {
      removeEventListener("online", a);
      removeEventListener("offline", b);
    };
  }, []);
  useEffect(() => {
    setSErr("");
    if (q.trim().length < 2) {
      setSug([]);
      return;
    }
    const ac = new AbortController(),
      t = setTimeout(async () => {
        setSLoad(true);
        try {
          const r = await searchCities(q.trim(), ac.signal);
          setSug(r);
          if (!r.length)
            setSErr(
              `No cities match “${q.trim()}”. Check the spelling or try a larger nearby city.`,
            );
        } catch (e) {
          if (e.name !== "AbortError") {
            setSug([]);
            setSErr(e.message);
          }
        } finally {
          setSLoad(false);
        }
      }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);
  const pick = (c) => {
    setQ("");
    setSug([]);
    setFErr("");
    setCity(c);
    load(c);
  };
  const blur = () => {
    if (!q.trim()) setFErr("Enter a city name to search.");
  };
  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return setFErr("Enter a city name to search.");
    if (sug[0]) pick(sug[0]);
    else if (!sErr && !sLoad)
      setSErr("Still searching… pick a suggestion from the list.");
  };
  const saveFavs = (f) => {
    setFavs(f);
    store.set("wb:favs", f);
  };
  const isFav = city && favs.some((f) => same(f, city));
  const toggleFav = () => {
    if (isFav) return setAsk(city);
    if (favs.length >= 5)
      return setNote(
        "You can save up to 5 favourites. Remove one to add another.",
      );
    setNote("");
    saveFavs([...favs, city]);
  };
  const setU = (u) => {
    setUnit(u);
    store.set("wb:unit", u);
  };
  const T = (t) => Math.round(unit === "C" ? t : (t * 9) / 5 + 32),
    Wd = (w) =>
      Math.round(unit === "C" ? w : w / 1.609) +
      (unit === "C" ? " km/h" : " mph");
  const sync = useCallback(async (s) => {
    (await navigator.serviceWorker?.ready)?.active?.postMessage(s);
  }, []);
  useEffect(() => {
    if (!rem.on || !city || perm !== "granted") return;
    const s = () =>
      sync({
        type: "state",
        s: {
          on: true,
          time: rem.time,
          city: city.name,
          lat: city.lat,
          lon: city.lon,
        },
      });
    s();
    const i = setInterval(() => sync({ type: "tick" }), 30000);
    return () => clearInterval(i);
  }, [rem, city, perm]);
  const enable = async () => {
    setWhy(false);
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") {
      const r = { ...rem, on: true };
      setRem(r);
      store.set("wb:rem", r);
      try {
        (await navigator.serviceWorker.ready).periodicSync?.register(
          "daily-weather",
          { minInterval: 12 * 3600 * 1000 },
        );
      } catch {}
    }
  };
  const disable = () => {
    const r = { ...rem, on: false };
    setRem(r);
    store.set("wb:rem", r);
    sync({ type: "state", s: { on: false, time: rem.time } });
  };
  const setTime = (t) => {
    const r = { ...rem, time: t };
    setRem(r);
    store.set("wb:rem", r);
  };
  return (
    <div className="app">
      <header>
        <h1>🌤️ WeatherBoard</h1>
        <div className="seg" role="group" aria-label="Units">
          {["C", "F"].map((u) => (
            <button key={u} aria-pressed={unit === u} onClick={() => setU(u)}>
              °{u}
            </button>
          ))}
        </div>
      </header>
      {!online && (
        <div className="banner warn" role="status">
          Offline mode — showing your last viewed city
          {wx ? "" : ". Nothing saved yet."}
        </div>
      )}
      {!lsOK && (
        <div className="banner" role="status">
          Browser storage is unavailable, so favourites and settings won’t
          persist after you close this tab.
        </div>
      )}
      <form onSubmit={submit} className="search" noValidate>
        <label htmlFor="c">Search city</label>
        <input
          id="c"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setFErr("");
          }}
          onBlur={blur}
          placeholder="e.g. Karachi"
          autoComplete="off"
          aria-invalid={!!(fErr || sErr)}
          aria-describedby="ce"
          role="combobox"
          aria-expanded={sug.length > 0}
        />
        <p id="ce" className="error" role="alert">
          {fErr || sErr}
        </p>
        {sLoad && <p className="muted">Searching…</p>}
        {sug.length > 0 && (
          <ul className="sug" role="listbox">
            {sug.map((c) => (
              <li key={c.lat + "," + c.lon}>
                <button type="button" onClick={() => pick(c)}>
                  {label(c)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <main className="grid">
        <section className="card main">
          {!city && !loading && (
            <div className="empty">
              <div className="big">🔎</div>
              <h2>Search for a city</h2>
              <p className="muted">
                Pick one to see current conditions and the 5-day forecast.
              </p>
            </div>
          )}
          {loading && (
            <div className="skel" aria-busy="true" aria-label="Loading weather">
              <i />
              <i />
              <i />
            </div>
          )}
          {err && (
            <div className="error box" role="alert">
              {err}{" "}
              {city && online && (
                <button className="link" onClick={() => load(city)}>
                  Retry
                </button>
              )}
            </div>
          )}
          {city && wx && !loading && (
            <>
              <div className="row">
                <div>
                  <h2>{label(city)}</h2>
                  <p className="muted">{wx.cur.d || "Current conditions"}</p>
                </div>
                <button
                  className="fav"
                  onClick={toggleFav}
                  aria-pressed={isFav}
                  aria-label={
                    isFav ? "Remove from favourites" : "Save to favourites"
                  }
                >
                  {isFav ? "★" : "☆"}
                </button>
              </div>
              {note && (
                <p className="error" role="alert">
                  {note}
                </p>
              )}
              <div className="now">
                <span className="ico">{wx.cur.i}</span>
                <span className="temp">{T(wx.cur.t)}°</span>
              </div>
              <div className="stats">
                <div>
                  <b>{wx.cur.h}%</b>
                  <span>Humidity</span>
                </div>
                <div>
                  <b>{Wd(wx.cur.w)}</b>
                  <span>Wind</span>
                </div>
              </div>
              <h3>5-day forecast</h3>
              <div className="days">
                {wx.days.map((d) => (
                  <div key={d.d} className="day">
                    <span>
                      {new Date(d.d + "T12:00").toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </span>
                    <span className="ico s">{d.i}</span>
                    <b>{T(d.max)}°</b>
                    <span className="muted">{T(d.min)}°</span>
                  </div>
                ))}
              </div>
              <p className="muted small">Source: {wx.src}</p>
            </>
          )}
        </section>
        <aside>
          <section className="card">
            <h3>
              Favourites <span className="muted">{favs.length}/5</span>
            </h3>
            {!favs.length && (
              <p className="muted">
                No favourites yet. Tap ☆ on a city to save it.
              </p>
            )}
            <ul className="favs">
              {favs.map((f) => (
                <li key={f.lat + "," + f.lon}>
                  {ask && same(ask, f) ? (
                    <div className="confirm">
                      <span>Remove {f.name}?</span>
                      <button
                        className="danger"
                        onClick={() => {
                          saveFavs(favs.filter((x) => !same(x, f)));
                          setAsk(null);
                        }}
                      >
                        Yes
                      </button>
                      <button onClick={() => setAsk(null)}>No</button>
                    </div>
                  ) : (
                    <>
                      <button className="fl" onClick={() => pick(f)}>
                        {label(f)}
                      </button>
                      <button
                        className="x"
                        aria-label={`Remove ${f.name}`}
                        onClick={() => setAsk(f)}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h3>Morning reminder</h3>
            {perm === "unsupported" ? (
              <p className="muted">
                Notifications aren’t supported in this browser. You can still
                check the weather here any time.
              </p>
            ) : (
              <>
                <label htmlFor="t">Remind me at</label>
                <input
                  id="t"
                  type="time"
                  value={rem.time}
                  onChange={(e) => setTime(e.target.value)}
                />
                {perm === "denied" && (
                  <p className="error" role="alert">
                    Notifications are blocked. Enable them in your browser’s
                    site settings to use reminders — everything else still
                    works.
                  </p>
                )}
                {rem.on && perm === "granted" ? (
                  <button onClick={disable}>Turn off reminder</button>
                ) : (
                  <button
                    className="primary"
                    onClick={() => setWhy(true)}
                    disabled={perm === "denied" || !city}
                  >
                    Enable reminder
                  </button>
                )}
                {!city && <p className="muted small">Pick a city first.</p>}
                {rem.on && (
                  <p className="muted small">
                    Reminder for {city?.name} at {rem.time}. For best results
                    install the app (see README).
                  </p>
                )}
              </>
            )}
          </section>
        </aside>
      </main>
      {why && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="card">
            <h3>Get a daily weather nudge?</h3>
            <p>
              We’ll send one notification each morning at {rem.time} with
              today’s weather for {city?.name}. Your browser will now ask for
              permission — you can turn this off any time.
            </p>
            <div className="row">
              <button onClick={() => setWhy(false)}>Not now</button>
              <button className="primary" onClick={enable}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
