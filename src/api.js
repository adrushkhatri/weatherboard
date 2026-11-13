const OWM = import.meta.env.VITE_OWM_KEY,
  RK = import.meta.env.VITE_RAPIDAPI_KEY;
const NET =
  "Can’t reach the service. Check your internet connection and try again.";
async function get(url, opt) {
  let r;
  try {
    r = await fetch(url, opt);
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error(NET);
  }
  if (r.status === 429)
    throw new Error(
      "Too many requests right now. Wait a minute and try again.",
    );
  if (!r.ok)
    throw new Error(
      `The service returned an error (${r.status}). Please try again shortly.`,
    );
  return r.json();
}
export async function searchCities(q, signal) {
  if (RK) {
    const j = await get(
      `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodeURIComponent(q)}&limit=6&sort=-population`,
      {
        signal,
        headers: {
          "X-RapidAPI-Key": RK,
          "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
        },
      },
    );
    return j.data.map((c) => ({
      name: c.city,
      country: c.countryCode,
      region: c.region,
      lat: c.latitude,
      lon: c.longitude,
    }));
  }
  const j = await get(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6`,
    { signal },
  ); // fallback when no GeoDB key
  return (j.results || []).map((c) => ({
    name: c.name,
    country: c.country_code,
    region: c.admin1,
    lat: c.latitude,
    lon: c.longitude,
  }));
}
const E = (i) =>
  i < 300
    ? "⛈️"
    : i < 600
      ? "🌧️"
      : i < 700
        ? "❄️"
        : i < 800
          ? "🌫️"
          : i === 800
            ? "☀️"
            : i < 803
              ? "⛅"
              : "☁️";
const W = (c) =>
  c === 0
    ? "☀️"
    : c < 3
      ? "⛅"
      : c === 3
        ? "☁️"
        : c < 50
          ? "🌫️"
          : c < 70
            ? "🌧️"
            : c < 80
              ? "❄️"
              : c < 90
                ? "🌦️"
                : "⛈️";
async function owm(c) {
  const b = "https://api.openweathermap.org/data/2.5/",
    q = `lat=${c.lat}&lon=${c.lon}&units=metric&appid=${OWM}`;
  const [a, f] = await Promise.all([
      get(b + "weather?" + q),
      get(b + "forecast?" + q),
    ]),
    g = {};
  f.list.forEach((x) => (g[x.dt_txt.slice(0, 10)] ??= []).push(x));
  return {
    src: "OpenWeatherMap",
    cur: {
      t: a.main.temp,
      h: a.main.humidity,
      w: a.wind.speed * 3.6,
      i: E(a.weather[0].id),
      d: a.weather[0].description,
    },
    days: Object.entries(g)
      .slice(0, 5)
      .map(([d, l]) => ({
        d,
        min: Math.min(...l.map((x) => x.main.temp_min)),
        max: Math.max(...l.map((x) => x.main.temp_max)),
        i: E(l[l.length >> 1].weather[0].id),
      })),
  };
}
async function om(c) {
  const j = await get(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`,
    ),
    k = j.current;
  return {
    src: "Open-Meteo",
    cur: {
      t: k.temperature_2m,
      h: k.relative_humidity_2m,
      w: k.wind_speed_10m,
      i: W(k.weather_code),
      d: "",
    },
    days: j.daily.time.map((d, n) => ({
      d,
      min: j.daily.temperature_2m_min[n],
      max: j.daily.temperature_2m_max[n],
      i: W(j.daily.weather_code[n]),
    })),
  };
}
export async function getWeather(c) {
  if (OWM) {
    try {
      return await owm(c);
    } catch {}
  }
  return om(c);
} // OWM first, Open-Meteo fallback
