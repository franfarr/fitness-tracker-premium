import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fitness-tracker-app-v2";

const getIcon = (id) => {
  switch (id) {
    case "bw":
      return "⚖️";
    case "calories":
      return "🔥";
    case "protein":
      return "🥩";
    case "carbs":
      return "🍞";
    case "fat":
      return "🥑";
    case "sleep":
      return "😴";
    case "water":
      return "💧";
    case "steps":
      return "👣";
    default:
      return "•";
  }
};

const defaultState = {
  title: "Fitness Tracker",
  trackerFields: [
    { id: "bw", label: "Bodyweight", unit: "kg", enabled: true },
    { id: "calories", label: "Calories", unit: "kcal", enabled: true },
    { id: "protein", label: "Protein", unit: "g", enabled: true },
    { id: "carbs", label: "Carbs", unit: "g", enabled: true },
    { id: "fat", label: "Fat", unit: "g", enabled: true },
    { id: "sleep", label: "Sleep", unit: "hrs", enabled: true },
    { id: "steps", label: "Steps", unit: "steps", enabled: true },
    { id: "water", label: "Water", unit: "L", enabled: true },
  ],
  goals: {
    bw: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    sleep: "",
    steps: "10000",
    water: "",
  },
  dailyHabits: [
    { id: "d1", name: "Game of rings" },
    { id: "d2", name: "Read 15 minutes" },
    { id: "d3", name: "Multivitamins + creatine" },
    { id: "d4", name: "Irish lesson" },
    { id: "d5", name: "10k steps" },
    { id: "d6", name: "3L water + electrolytes" },
    { id: "d7", name: "Bedtime routine" },
    { id: "d8", name: ">7.5 hours sleep" },
    { id: "d9", name: "No alcohol" },
    { id: "d10", name: "Lunch made for tomorrow" },
  ],
  weeklyHabits: [
    { id: "w1", name: "Weekly food shop" },
    { id: "w2", name: "2 or more gym sessions" },
    { id: "w3", name: "1 or more 5k runs" },
    { id: "w4", name: "Bring Kayden out" },
    { id: "w5", name: "Date night / movie night" },
    { id: "w6", name: "See friends" },
    { id: "w7", name: "Family video calls" },
  ],
  entries: {},
  weeklyChecks: {},
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatPrettyDate(key) {
  return new Date(key).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function dayName(key) {
  return new Date(key).toLocaleDateString(undefined, { weekday: "long" });
}

function weekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return dateKey(d);
}

function getRange(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return dateKey(d);
  });
}

function avg(values) {
  const nums = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return null;
  return +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

function percent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function statChange(current, previous) {
  if (current == null || previous == null) return null;
  return +(current - previous).toFixed(1);
}

function linePoints(data, width, height, target, pad = 16) {
  const values = data
    .map((d) => d.value)
    .filter((v) => typeof v === "number");

  if (!values.length) return { points: "", min: 0, max: 0 };

  const allValues = target ? [...values, target] : values;

  const min = Math.min(...allValues) - 1;
  const max = Math.max(...allValues) + 1;
  const spread = max - min;

  const points = data
    .map((d, i) => {
      if (d.value == null) return null;

      const x =
        pad + (i * (width - pad * 2)) / Math.max(data.length - 1, 1);

      const y =
        height -
        pad -
        ((d.value - min) / spread) * (height - pad * 2);

      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  return { points, min, max };
}

function validChartPoints(data) {
  return data.filter((point) => typeof point.value === "number" && !Number.isNaN(point.value));
}

function App() {
  const [state, setState] = useState(defaultState);
  const [tab, setTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [editing, setEditing] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const enabledFields = state.trackerFields.filter((field) => field.enabled);
  const currentEntry = state.entries[selectedDate] || {
    metrics: {},
    habits: {},
    notes: "",
  };
  const currentWeek = weekStart(new Date(selectedDate));
  const currentWeekChecks = state.weeklyChecks[currentWeek] || {};

  const dailyDone = state.dailyHabits.filter((h) => currentEntry.habits?.[h.id]).length;
  const weeklyDone = state.weeklyHabits.filter((h) => currentWeekChecks?.[h.id]).length;
  const dailyPercent = percent(dailyDone, state.dailyHabits.length);
  const weeklyPercent = percent(weeklyDone, state.weeklyHabits.length);

  const last14 = getRange(14);
  const chartData = last14.map((key) => ({
    key,
    label: new Date(key).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    value: Number(state.entries[key]?.metrics?.bw) || null,
  }));

  const validWeightPoints = validChartPoints(chartData);

  const targetWeight = state.goals?.bw ? Number(state.goals.bw) : null;

  const last7 = getRange(7);
  const prev7 = getRange(14).slice(0, 7);
  const currentWeightAvg = avg(last7.map((key) => Number(state.entries[key]?.metrics?.bw)));
  const previousWeightAvg = avg(prev7.map((key) => Number(state.entries[key]?.metrics?.bw)));
  const weeklyWeightChange = statChange(currentWeightAvg, previousWeightAvg);

  const firstWeight = useMemo(() => {
    const items = Object.entries(state.entries)
      .filter(([, entry]) => entry?.metrics?.bw !== "" && entry?.metrics?.bw != null)
      .sort(([a], [b]) => a.localeCompare(b));
    if (!items.length) return null;
    return Number(items[0][1].metrics.bw);
  }, [state.entries]);

  const currentWeight =
    currentEntry.metrics?.bw !== "" && currentEntry.metrics?.bw != null
      ? Number(currentEntry.metrics.bw)
      : currentWeightAvg;

  const totalWeightChange =
    firstWeight != null && currentWeight != null
      ? +(currentWeight - firstWeight).toFixed(1)
      : null;

  const metricAverages = enabledFields.map((field) => ({
    ...field,
    avg: avg(last7.map((key) => Number(state.entries[key]?.metrics?.[field.id]))),
  }));

  function updateEntry(updater) {
    setState((prev) => {
      const existing = prev.entries[selectedDate] || { metrics: {}, habits: {}, notes: "" };
      return {
        ...prev,
        entries: {
          ...prev.entries,
          [selectedDate]: updater(existing),
        },
      };
    });
  }

  function updateMetric(id, value) {
    updateEntry((entry) => ({
      ...entry,
      metrics: { ...entry.metrics, [id]: value },
    }));
  }

  function updateGoal(id, value) {
    setState((prev) => ({
      ...prev,
      goals: {
        ...prev.goals,
        [id]: value,
      },
    }));
  }

  function toggleDailyHabit(id) {
    updateEntry((entry) => ({
      ...entry,
      habits: { ...entry.habits, [id]: !entry.habits?.[id] },
    }));
  }

  function toggleWeeklyHabit(id) {
    setState((prev) => ({
      ...prev,
      weeklyChecks: {
        ...prev.weeklyChecks,
        [currentWeek]: {
          ...(prev.weeklyChecks[currentWeek] || {}),
          [id]: !(prev.weeklyChecks[currentWeek] || {})[id],
        },
      },
    }));
  }

  function openEditor(type) {
    setEditing(type);
    setDraftItems(type === "daily" ? state.dailyHabits : state.weeklyHabits);
  }

  function saveEditedList() {
    const cleaned = draftItems.filter((item) => item.name.trim());
    setState((prev) => ({
      ...prev,
      ...(editing === "daily" ? { dailyHabits: cleaned } : { weeklyHabits: cleaned }),
    }));
    setEditing(null);
  }

  return (
    <div style={styles.app}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />
      <div style={styles.glowThree} />

      <div style={styles.shell}>
       <header style={styles.hero}>
  <div style={styles.heroTop}>
    <div>
      <div style={styles.badge}>Premium fitness and habit tracker</div>
      <h1 style={styles.title}>{state.title}</h1>
      <p style={styles.subtitle}>
        Track your habits, goals, nutrition, and progress in one place.
      </p>
    </div>

    <button
      onClick={() => setSettingsOpen(true)}
      style={styles.settingsCog}
      aria-label="Open settings"
      title="Settings"
    >
      ⚙️
    </button>
  </div>

  <div style={styles.heroGrid}>
    <div style={styles.smallPanel}>
      <div style={styles.smallMuted}>Today</div>
      <div style={styles.smallStrong}>{dayName(selectedDate)}</div>
      <div style={styles.smallMuted}>{formatPrettyDate(selectedDate)}</div>
    </div>
    <div style={styles.smallPanel}>
      <div style={styles.smallMuted}>This week</div>
      <div style={styles.smallStrong}>{weeklyPercent}% complete</div>
      <div style={styles.smallMuted}>Weekly habit score</div>
    </div>
  </div>
</header>
        <nav style={styles.tabBar}>
          {[
            ["dashboard", "Dashboard"],
            ["checkin", "Daily Check-In"],
            ["daily", "Daily Habits"],
            ["weekly", "Weekly Habits"],
            ["goals", "Goals"],
            ["progress", "Progress"],
           ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={tab === key ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <section style={styles.section}>
            <div style={styles.cardGrid}>
              <MetricCard
                title="Daily habits"
                value={`${dailyDone}/${state.dailyHabits.length}`}
                subtitle={`${dailyPercent}% complete today`}
                note="Tap into Daily Habits to complete tonight's checklist"
              />
              <MetricCard
                title="Weekly habits"
                value={`${weeklyDone}/${state.weeklyHabits.length}`}
                subtitle={`${weeklyPercent}% complete this week`}
                note="Weekly tracker resets with a new week"
              />
              <MetricCard
                title="Current weight"
                value={currentWeight != null ? `${currentWeight} kg` : "-"}
                subtitle={
                  firstWeight != null
                    ? `Started at ${firstWeight} kg${state.goals?.bw ? ` • Target ${state.goals.bw} kg` : ""}`
                    : state.goals?.bw
                    ? `Target ${state.goals.bw} kg`
                    : "Add bodyweight entries to compare"
                }
                note={
                  totalWeightChange != null
                    ? `${totalWeightChange < 0 ? "Down" : "Up"} ${Math.abs(totalWeightChange)} kg overall`
                    : "No comparison yet"
                }
              />
             
            </div>

            <Panel title="Goals snapshot" subtitle="Your current target values">
              <div style={styles.listStack}>
                {enabledFields.map((field) => (
                  <div key={field.id} style={styles.statRow}>
                    <div style={styles.statLeft}>
                      <div style={styles.iconBox}>{getIcon(field.id)}</div>
                      <div>
                        <div style={styles.statLabel}>{field.label}</div>
                        <div style={styles.statSub}>Target</div>
                      </div>
                    </div>
                    <div style={styles.statValue}>
                      {state.goals[field.id] ? `${state.goals[field.id]} ${field.unit}` : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <div style={styles.stackGap}>
             <Panel title="Weight trend" subtitle="Bodyweight over the last 14 days">
  <div style={styles.chartWrap}>
    {(() => {
      const { points, min, max } = linePoints(
        chartData,
        320,
        200,
        targetWeight
      );

      if (!points) {
        return (
          <div style={{ padding: 20, color: "#aaa" }}>
            No weight data yet
          </div>
        );
      }

      const targetY =
        targetWeight != null
          ? 200 -
            16 -
            ((targetWeight - min) / (max - min)) * (200 - 32)
          : null;

      return (
        <svg viewBox="0 0 320 200" style={styles.chart}>
          <rect
            x="0"
            y="0"
            width="320"
            height="200"
            rx="18"
            fill="#05070a"
          />

          {/* TARGET LINE */}
          {targetWeight != null && (
            <>
              <line
                x1="16"
                x2="304"
                y1={targetY}
                y2={targetY}
                stroke="#facc15"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
              <text
                x="260"
                y={targetY - 6}
                fill="#facc15"
                fontSize="12"
              >
                Target {targetWeight}kg
              </text>
            </>
          )}

          {/* WEIGHT LINE */}
          <polyline
            fill="none"
            stroke="#67e8f9"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>
      );
    })()}
  </div>
</Panel>

              <Panel title="This week at a glance">
                <div style={styles.listStack}>
                  {metricAverages.map((field) => (
                    <div key={field.id} style={styles.statRow}>
                      <div style={styles.statLeft}>
                        <div style={styles.iconBox}>{getIcon(field.id)}</div>
                        <div>
                          <div style={styles.statLabel}>{field.label}</div>
                          <div style={styles.statSub}>7-day average</div>
                        </div>
                      </div>
                      <div style={styles.statValue}>
                        {field.avg != null ? `${field.avg} ${field.unit}` : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </section>
        )}

        {tab === "checkin" && (
          <section style={styles.section}>
            <Panel
              title="Daily Check-In"
              subtitle="Enter tonight's bodyweight, food, sleep, steps, and notes."
            >
              <div style={styles.inputTopRow}>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGrid}>
                {enabledFields.map((field) => (
                  <div key={field.id} style={styles.inputCard}>
                    <div style={styles.inputLabel}>{field.label}</div>
                    <div style={styles.inputUnit}>{field.unit}</div>
                    <input
                      type="number"
                      value={currentEntry.metrics?.[field.id] ?? ""}
                      onChange={(e) => updateMetric(field.id, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      style={styles.input}
                    />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Notes">
              <textarea
                value={currentEntry.notes || ""}
                onChange={(e) => updateEntry((entry) => ({ ...entry, notes: e.target.value }))}
                placeholder="Anything to note tonight? Hunger, energy, workout, recovery, mood..."
                style={styles.textarea}
              />
            </Panel>
          </section>
        )}

        {tab === "daily" && (
          <section style={styles.section}>
            <Panel
              title="Daily Habits"
              subtitle="Tick off habits for the selected day and keep the list editable."
            >
              <div style={styles.progressTop}>
                <div>
                  <div style={styles.smallMuted}>Today's score</div>
                  <div style={styles.largeScore}>
                    {dailyDone} / {state.dailyHabits.length}
                  </div>
                </div>
                <button style={styles.secondaryButton} onClick={() => openEditor("daily")}>
                  Edit
                </button>
              </div>
              <Bar value={dailyPercent} />
              <div style={styles.progressText}>{dailyPercent}% complete</div>
              <div style={styles.habitList}>
                {state.dailyHabits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleDailyHabit(habit.id)}
                    style={
                      currentEntry.habits?.[habit.id]
                        ? { ...styles.habitCard, ...styles.habitDone }
                        : styles.habitCard
                    }
                  >
                    <span style={styles.habitName}>{habit.name}</span>
                    <span style={currentEntry.habits?.[habit.id] ? styles.checkDone : styles.check}>
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {tab === "weekly" && (
          <section style={styles.section}>
            <Panel
              title="Weekly Habits"
              subtitle="Use this for the big weekly wins instead of ticking boxes in a spreadsheet."
            >
              <div style={styles.progressTop}>
                <div>
                  <div style={styles.smallMuted}>Week starting</div>
                  <div style={styles.largeScore}>{formatPrettyDate(currentWeek)}</div>
                </div>
                <button style={styles.secondaryButton} onClick={() => openEditor("weekly")}>
                  Edit
                </button>
              </div>
              <Bar value={weeklyPercent} />
              <div style={styles.progressText}>{weeklyPercent}% complete</div>
              <div style={styles.habitList}>
                {state.weeklyHabits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleWeeklyHabit(habit.id)}
                    style={
                      currentWeekChecks?.[habit.id]
                        ? { ...styles.habitCard, ...styles.weeklyDone }
                        : styles.habitCard
                    }
                  >
                    <span style={styles.habitName}>{habit.name}</span>
                    <span style={currentWeekChecks?.[habit.id] ? styles.checkDone : styles.check}>
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {tab === "goals" && (
          <section style={styles.section}>
            <Panel title="Goals" subtitle="Set your targets so progress actually means something.">
              <div style={styles.inputGrid}>
                {enabledFields.map((field) => (
                  <div key={field.id} style={styles.inputCard}>
                    <div style={styles.inputLabel}>{field.label}</div>
                    <div style={styles.inputUnit}>Target ({field.unit})</div>
                    <input
                      type="number"
                      value={state.goals?.[field.id] ?? ""}
                      onChange={(e) => updateGoal(field.id, e.target.value)}
                      placeholder={`Set ${field.label.toLowerCase()} target`}
                      style={styles.input}
                    />
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {tab === "progress" && (
          <section style={styles.section}>
            <div style={styles.cardGrid}>
              {metricAverages.map((field) => (
                <div key={field.id} style={styles.metricTile}>
                  <div style={styles.tileLabel}>{field.label}</div>
                  <div style={styles.tileValue}>{field.avg != null ? field.avg : "-"}</div>
                  <div style={styles.tileSub}>
                    7-day average {field.unit ? `(${field.unit})` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      {settingsOpen && (
  <div style={styles.settingsOverlay} onClick={() => setSettingsOpen(false)}>
    <div style={styles.settingsPanel} onClick={(e) => e.stopPropagation()}>
      <div style={styles.settingsPanelTop}>
        <div>
          <div style={styles.panelTitle}>Settings</div>
          <div style={styles.panelSub}>Manage app title, tracker fields, and checklists.</div>
        </div>
        <button style={styles.closeButton} onClick={() => setSettingsOpen(false)}>
          ×
        </button>
      </div>

      <div style={styles.settingsCard}>
        <label style={styles.settingsLabel}>App title</label>
        <input
          value={state.title}
          onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
          style={styles.input}
        />
      </div>

      <div style={styles.settingsCard}>
        <div style={styles.settingsHeading}>Tracker fields</div>
        <div style={styles.settingsHelp}>Turn fields on or off.</div>
        <div style={styles.switchList}>
          {state.trackerFields.map((field) => (
            <label key={field.id} style={styles.switchRow}>
              <div>
                <div style={styles.switchTitle}>{field.label}</div>
                <div style={styles.switchUnit}>{field.unit || "No unit"}</div>
              </div>
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setState((prev) => ({
                    ...prev,
                    trackerFields: prev.trackerFields.map((item) =>
                      item.id === field.id ? { ...item, enabled: checked } : item
                    ),
                  }));
                }}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={styles.settingsCard}>
        <div style={styles.settingsRowBetween}>
          <div>
            <div style={styles.switchTitle}>Daily Habits</div>
            <div style={styles.switchUnit}>Rename, add, or remove daily checklist items.</div>
          </div>
          <button style={styles.secondaryButton} onClick={() => openEditor("daily")}>
            Edit
          </button>
        </div>
      </div>

      <div style={styles.settingsCard}>
        <div style={styles.settingsRowBetween}>
          <div>
            <div style={styles.switchTitle}>Weekly Habits</div>
            <div style={styles.switchUnit}>Rename, add, or remove weekly checklist items.</div>
          </div>
          <button style={styles.secondaryButton} onClick={() => openEditor("weekly")}>
            Edit
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      </div>

      {editing && (
        <div style={styles.modalBackdrop} onClick={() => setEditing(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              {editing === "daily" ? "Edit Daily Habits" : "Edit Weekly Habits"}
            </div>
            <div style={styles.modalList}>
              {draftItems.map((item, index) => (
                <div key={item.id} style={styles.modalRow}>
                  <span style={styles.modalIndex}>{index + 1}.</span>
                  <input
                    value={item.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDraftItems((prev) =>
                        prev.map((row) => (row.id === item.id ? { ...row, name: value } : row))
                      );
                    }}
                    style={styles.input}
                  />
                  <button
                    style={styles.smallDanger}
                    onClick={() =>
                      setDraftItems((prev) => prev.filter((row) => row.id !== item.id))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.secondaryButton}
                onClick={() =>
                  setDraftItems((prev) => [
                    ...prev,
                    { id: `${Date.now()}-${Math.random()}`, name: "New habit" },
                  ])
                }
              >
                Add habit
              </button>
              <button style={styles.primaryButton} onClick={saveEditedList}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, note }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTitle}>{title}</div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricSub}>{subtitle}</div>
      <div style={styles.metricNote}>{note}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>{title}</div>
      {subtitle ? <div style={styles.panelSub}>{subtitle}</div> : null}
      <div style={styles.panelBody}>{children}</div>
    </div>
  );
}

function Bar({ value }) {
  return (
    <div style={styles.barWrap}>
      <div style={{ ...styles.barFill, width: `${value}%` }} />
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(34,211,238,0.20), transparent 25%), radial-gradient(circle at bottom right, rgba(232,121,249,0.16), transparent 22%), linear-gradient(180deg, #050816 0%, #070b19 100%)",
    color: "#fff",
    position: "relative",
    overflowX: "hidden",
  },
  glowOne: {
    position: "fixed",
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: "50%",
    background: "rgba(34,211,238,0.18)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "fixed",
    bottom: 30,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "rgba(168,85,247,0.16)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  glowThree: {
    position: "fixed",
    top: 320,
    left: "35%",
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "rgba(232,121,249,0.10)",
    filter: "blur(90px)",
    pointerEvents: "none",
  },
  shell: {
    width: "100%",
    maxWidth: 500,
    margin: "0 auto",
    padding: "14px 14px 28px",
    position: "relative",
    zIndex: 2,
  },
  hero: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(18px)",
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
    boxShadow: "0 0 60px rgba(34,211,238,0.08)",
  },
  badge: {
    display: "inline-block",
    background: "rgba(34,211,238,0.10)",
    color: "#c7f9ff",
    border: "1px solid rgba(34,211,238,0.20)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
  },
  subtitle: {
    color: "#d6dbe6",
    fontSize: 14,
    lineHeight: 1.5,
    marginTop: 10,
    marginBottom: 0,
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 18,
  },
  smallPanel: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 14,
    backdropFilter: "blur(14px)",
  },
  smallMuted: {
    color: "#d6dbe6",
    fontSize: 13,
  },
  smallStrong: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 4,
  },
  tabBar: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 26,
    padding: 8,
    marginBottom: 14,
    position: "sticky",
    top: 8,
    zIndex: 5,
    backdropFilter: "blur(16px)",
    boxShadow: "0 0 35px rgba(255,255,255,0.03)",
  },
  tab: {
    border: "none",
    background: "transparent",
    color: "#e5e7eb",
    padding: "12px 10px",
    borderRadius: 18,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: {
    background: "#ffffff",
    color: "#000000",
  },
  section: {
    display: "grid",
    gap: 14,
  },
  cardGrid: {
    display: "grid",
    gap: 12,
  },
  metricCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 26,
    padding: 18,
    backdropFilter: "blur(16px)",
    boxShadow: "0 0 45px rgba(34,211,238,0.06)",
  },
  metricTitle: {
    color: "#ffffff",
    fontSize: 15,
    marginBottom: 10,
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  metricSub: {
    color: "#f3f4f6",
    marginTop: 8,
    fontSize: 16,
  },
  metricNote: {
    color: "#d1d5db",
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.45,
  },
  stackGap: {
    display: "grid",
    gap: 14,
  },
  panel: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 28,
    padding: 18,
    backdropFilter: "blur(18px)",
    boxShadow: "0 0 45px rgba(34,211,238,0.06)",
  },
  panelTitle: {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 6,
    color: "#ffffff",
    letterSpacing: "-0.03em",
  },
  panelSub: {
    fontSize: 14,
    color: "#d1d5db",
    lineHeight: 1.5,
    marginBottom: 14,
  },
  panelBody: {
    display: "grid",
    gap: 12,
  },
  chartWrap: {
    overflow: "hidden",
    borderRadius: 20,
    background: "#05070a",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  chart: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  chartMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 8,
  },
  chartLabels: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 8,
    padding: "0 4px",
  },
  chartEmpty: {
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 1.5,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 20,
  },
  listStack: {
    display: "grid",
    gap: 12,
  },
  statRow: {
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    boxShadow: "0 0 18px rgba(34,211,238,0.10)",
  },
  statLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 600,
  },
  statSub: {
    color: "#d1d5db",
    fontSize: 14,
    marginTop: 4,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "right",
  },
  inputTopRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  inputGrid: {
    display: "grid",
    gap: 12,
  },
  inputCard: {
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 14,
  },
  inputLabel: {
    color: "#ffffff",
    fontWeight: 700,
    marginBottom: 4,
  },
  inputUnit: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    padding: "14px 14px",
    outline: "none",
    backdropFilter: "blur(12px)",
  },
  textarea: {
    width: "100%",
    minHeight: 140,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    padding: 14,
    outline: "none",
    backdropFilter: "blur(12px)",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  largeScore: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: 800,
    marginTop: 6,
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    borderRadius: 16,
    padding: "12px 14px",
    fontWeight: 700,
    cursor: "pointer",
    backdropFilter: "blur(12px)",
  },
  primaryButton: {
    border: "none",
    background: "#ffffff",
    color: "#050816",
    borderRadius: 16,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  barWrap: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    marginTop: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #22d3ee 0%, #34d399 100%)",
  },
  progressText: {
    color: "#d1d5db",
    fontSize: 14,
  },
  habitList: {
    display: "grid",
    gap: 10,
    marginTop: 4,
  },
  habitCard: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
    color: "#ffffff",
    cursor: "pointer",
  },
  habitDone: {
    background: "rgba(16,185,129,0.18)",
    border: "1px solid #34d399",
  },
  weeklyDone: {
    background: "rgba(59,130,246,0.18)",
    border: "1px solid #60a5fa",
  },
  habitName: {
    fontWeight: 700,
    lineHeight: 1.4,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8b93a4",
    flexShrink: 0,
  },
  checkDone: {
    width: 30,
    height: 30,
    borderRadius: 10,
    border: "1px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    background: "rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  metricTile: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 16,
    backdropFilter: "blur(16px)",
  },
  tileLabel: {
    color: "#f3f4f6",
    fontSize: 15,
  },
  tileValue: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: 800,
    marginTop: 8,
  },
  tileSub: {
    color: "#d1d5db",
    fontSize: 14,
    marginTop: 8,
  },
  settingsCard: {
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
  },
  settingsLabel: {
    display: "block",
    color: "#ffffff",
    fontWeight: 700,
    marginBottom: 10,
  },
  settingsHeading: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 800,
  },
  settingsHelp: {
    color: "#d1d5db",
    marginTop: 6,
    marginBottom: 12,
  },
  switchList: {
    display: "grid",
    gap: 10,
  },
  switchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    color: "#ffffff",
  },
  switchTitle: {
    color: "#ffffff",
    fontWeight: 700,
  },
  switchUnit: {
    color: "#d1d5db",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 1.4,
  },
  settingsRowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 460,
    background: "rgba(17,18,23,0.95)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(20px)",
    borderRadius: 24,
    padding: 18,
  },
  modalTitle: {
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 24,
    marginBottom: 12,
  },
  modalList: {
    display: "grid",
    gap: 10,
    maxHeight: "50vh",
    overflow: "auto",
  },
  modalRow: {
    display: "grid",
    gridTemplateColumns: "24px 1fr 42px",
    gap: 8,
    alignItems: "center",
  },
  modalIndex: {
    color: "#d1d5db",
    fontSize: 14,
  },
  smallDanger: {
    border: "1px solid #7f1d1d",
    background: "#1f0a0a",
    color: "#fecaca",
    borderRadius: 14,
    height: 42,
    cursor: "pointer",
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },
  heroTop: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
},
settingsCog: {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  borderRadius: 18,
  width: 48,
  height: 48,
  minWidth: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  cursor: "pointer",
  backdropFilter: "blur(12px)",
  boxShadow: "0 0 18px rgba(34,211,238,0.08)",
},
settingsOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  zIndex: 30,
  display: "flex",
  justifyContent: "flex-end",
},
settingsPanel: {
  width: "min(92vw, 430px)",
  height: "100vh",
  overflowY: "auto",
  background: "rgba(10,15,30,0.96)",
  borderLeft: "1px solid rgba(255,255,255,0.12)",
  padding: 18,
  boxShadow: "-20px 0 80px rgba(34,211,238,0.16)",
  backdropFilter: "blur(22px)",
  animation: "slideInSettings 0.22s ease-out",
},
settingsPanelTop: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
},
closeButton: {
  width: 42,
  height: 42,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  fontSize: 26,
  lineHeight: 1,
  cursor: "pointer",
},  
};

export default App;
