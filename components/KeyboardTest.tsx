"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import styles from "./KeyboardTest.module.scss";
import clsx from "clsx";

type RegisteredKeyboardEntry = (
  | {
      name: "compositionStart" | "compositionUpdate" | "compositionEnd";
      isComposingEvent?: undefined;
      text: string;
    }
  | {
      name: "change";
      isComposingEvent: boolean;
      type: string;
      text: string;
    }
  | {
      name: "keyDown";
      isComposingEvent: boolean;
      count?: number;
      text: string;
    }
  | {
      name: "keyUp";
      isComposingEvent?: boolean;
      count?: undefined;
      text: string;
    }
  | {
      name: "input";
      isComposingEvent: boolean;
      type: string;
      text: string | null;
    }
) & { id: number };

const maxEventCount = 50;

function getUpdatedQueueWithLimit(
  q: RegisteredKeyboardEntry[],
  value: RegisteredKeyboardEntry,
) {
  if (value.name === "keyDown") {
    const first = q[0];
    if (
      first !== undefined &&
      first.name === "keyDown" &&
      value.text === first.text &&
      value.isComposingEvent === first.isComposingEvent
    ) {
      return [
        { ...first, count: (first.count ?? 1) + 1 },
        ...q.slice(1, maxEventCount),
      ];
    }
  }
  return [value, ...q.slice(0, maxEventCount - 1)];
}

function isComposingEventToString(isComposingEvent: boolean | undefined) {
  if (!isComposingEvent) {
    return "";
  }
  return " (Composing)";
}

function EventName({ name }: { name: string }) {
  return <span className={styles.eventName}>{name}</span>;
}

function CompositionEvent({
  state: { name, text },
}: {
  state: Extract<
    RegisteredKeyboardEntry,
    { name: "compositionStart" | "compositionUpdate" | "compositionEnd" }
  >;
}) {
  return (
    <li className={clsx(styles.listItem, styles[name])}>
      <EventName name={name} /> <span className={styles.text}>{text}</span>
    </li>
  );
}

function ChangeEventEntry({
  state: { name, text, isComposingEvent, type },
}: {
  state: Extract<RegisteredKeyboardEntry, { name: "change" }>;
}) {
  return (
    <li
      className={clsx(
        styles.listItem,
        isComposingEvent && styles.otherWhenComposing,
      )}
    >
      <EventName name={name} />
      {isComposingEventToString(isComposingEvent)} {type}{" "}
      <span className={styles.text}>{text}</span>
    </li>
  );
}

function KeyUpDownEventEntry({
  state: { name, text, isComposingEvent, count },
}: {
  state:
    | Extract<RegisteredKeyboardEntry, { name: "keyDown" }>
    | Extract<RegisteredKeyboardEntry, { name: "keyUp" }>;
}) {
  return (
    <li
      className={clsx(
        styles.listItem,
        isComposingEvent && styles.otherWhenComposing,
      )}
    >
      <EventName name={name} /> <kbd>{text}</kbd>
      {isComposingEventToString(isComposingEvent)}
      {(count ?? 1) > 1 && <span className={styles.count}>{count}</span>}
    </li>
  );
}

function InputEventEntry({
  state: { name, text, isComposingEvent, type },
}: {
  state: Extract<RegisteredKeyboardEntry, { name: "input" }>;
}) {
  return (
    <li
      className={clsx(
        styles.listItem,
        isComposingEvent && styles.otherWhenComposing,
      )}
    >
      <EventName name={name} />
      {isComposingEventToString(isComposingEvent)} {type}{" "}
      {text !== null ? (
        <span className={styles.text}>{text}</span>
      ) : (
        <span className={styles.null}>(null)</span>
      )}
    </li>
  );
}

function KeyboardEvent({ state }: { state: RegisteredKeyboardEntry }) {
  switch (state.name) {
    case "compositionStart":
    case "compositionUpdate":
    case "compositionEnd":
      return <CompositionEvent state={state} />;
    case "change":
      return <ChangeEventEntry state={state} />;
    case "keyDown":
      return <KeyUpDownEventEntry state={state} />;
    case "keyUp":
      return <KeyUpDownEventEntry state={state} />;
    case "input":
      return <InputEventEntry state={state} />;
  }
}

type WatchingState = {
  readonly [name in RegisteredKeyboardEntry["name"]]: boolean;
};

const WATCHING_KEYS: ReadonlyArray<keyof WatchingState> = [
  "change",
  "keyDown",
  "keyUp",
  "compositionStart",
  "compositionUpdate",
  "compositionEnd",
  "input",
];

const ALL_ON_STATE: WatchingState = {
  change: true,
  keyDown: true,
  keyUp: true,
  compositionStart: true,
  compositionUpdate: true,
  compositionEnd: true,
  input: true,
};

const STORAGE_KEY = "kbdevents-watching";

function saveToLocalStorage(state: WatchingState): void {
  try {
    const enabledKeys = WATCHING_KEYS.filter((k) => state[k]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledKeys));
  } catch {
    // localStorage may be unavailable
  }
}

function loadFromLocalStorage(): WatchingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const state: Record<string, boolean> = {};
    for (const key of WATCHING_KEYS) {
      state[key] = parsed.includes(key);
    }
    return state as WatchingState;
  } catch {
    return null;
  }
}

function parseEventsFromURL(): WatchingState | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const eventsParam = params.get("events");
  if (eventsParam === null) return null;
  const requested = eventsParam.split(",").map((s) => s.trim());
  const state = {} as Record<string, boolean>;
  for (const key of WATCHING_KEYS) {
    state[key] = requested.includes(key);
  }
  return state as WatchingState;
}

function watchingStatesEqual(a: WatchingState, b: WatchingState): boolean {
  return WATCHING_KEYS.every((k) => a[k] === b[k]);
}

function getEventsURL(state: WatchingState): string {
  const currentURL = new URL(window.location.href);
  // Keep directory-like routes shareable with a trailing slash, while leaving
  // static export HTML file paths (e.g. /index.html) unchanged.
  const isFilePath = /\.html$/.test(currentURL.pathname);
  const pathname =
    currentURL.pathname.endsWith("/") || isFilePath
      ? currentURL.pathname
      : `${currentURL.pathname}/`;
  const url = new URL(currentURL.href);
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  const enabledKeys = WATCHING_KEYS.filter((key) => state[key]);
  url.searchParams.set("events", enabledKeys.join(","));
  return url.toString();
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }
  await navigator.clipboard.writeText(text);
  return true;
}

type SourceMode = "url" | "storage";

function watchingReducer(
  current: WatchingState,
  action: [keyof WatchingState | "all", boolean] | ["reset", WatchingState],
): WatchingState {
  const [name, value] = action;
  if (name === "reset") {
    return value as WatchingState;
  }
  if (name === "all") {
    return {
      change: value as boolean,
      keyDown: value as boolean,
      keyUp: value as boolean,
      compositionStart: value as boolean,
      compositionUpdate: value as boolean,
      compositionEnd: value as boolean,
      input: value as boolean,
    };
  }
  return { ...current, [name]: value as boolean };
}

export function KeyboardTest() {
  const [queue, updateQueue] = useState<RegisteredKeyboardEntry[]>([]);
  const [watching, setWatching] = useReducer(watchingReducer, ALL_ON_STATE);
  const [userChanged, setUserChanged] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [initInfo, setInitInfo] = useReducer(
    (
      _current: { initialized: boolean; sourceMode: SourceMode },
      action: { initialized: boolean; sourceMode: SourceMode },
    ) => action,
    { initialized: false, sourceMode: "storage" },
  );
  const initialUrlStateRef = useRef<WatchingState | null>(null);
  // Refs for the visibilitychange handler, which is registered once on mount
  // and needs access to current state without re-registering the listener.
  const watchingRef = useRef(watching);
  const sourceModeRef = useRef<SourceMode>("storage");

  // Sync watching ref in effect (React 19 disallows writing ref.current during render)
  useEffect(() => {
    watchingRef.current = watching;
  }, [watching]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setCopyMessage("");
    }, 2000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyMessage]);

  // Initialize from URL or Local Storage
  useEffect(() => {
    const urlState = parseEventsFromURL();
    if (urlState) {
      setWatching(["reset", urlState]);
      sourceModeRef.current = "url";
      initialUrlStateRef.current = urlState;
      setInitInfo({ initialized: true, sourceMode: "url" });
    } else {
      const stored = loadFromLocalStorage();
      if (stored) {
        setWatching(["reset", stored]);
      }
      sourceModeRef.current = "storage";
      setInitInfo({ initialized: true, sourceMode: "storage" });
    }
  }, []);

  // Auto-save for storage mode: visibilitychange + debounced on change
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (sourceModeRef.current === "storage") {
          saveToLocalStorage(watchingRef.current);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Wrapper to track user changes and trigger auto-save
  const handleSetWatching = (
    action: [keyof WatchingState | "all", boolean],
  ) => {
    setWatching(action);
    if (sourceModeRef.current === "url") {
      const newState = watchingReducer(watching, action);
      const urlState = initialUrlStateRef.current;
      if (urlState && !watchingStatesEqual(newState, urlState)) {
        setUserChanged(true);
      } else {
        setUserChanged(false);
      }
    } else {
      // Debounced save for storage mode
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage(watchingRef.current);
        saveTimeoutRef.current = null;
      }, 1000);
    }
  };

  const handleSaveToStorage = () => {
    saveToLocalStorage(watching);
    setUserChanged(false);
  };

  const handleCopyURL = async () => {
    try {
      const copied = await copyTextToClipboard(getEventsURL(watching));
      setCopyMessage(copied ? "Copied" : "Could not copy");
    } catch {
      setCopyMessage("Could not copy");
    }
  };

  const [nextId, updateNextId] = useReducer(
    (currentId) => (currentId + 1) & 0xffff,
    0,
  );
  return (
    <div>
      {initInfo.initialized && initInfo.sourceMode === "url" && (
        <div className={styles.urlIndicator}>
          <span>Showing settings specified by URL</span>
          {userChanged && (
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSaveToStorage}
            >
              Save settings
            </button>
          )}
        </div>
      )}
      <div className={styles.togglesContainer}>
        <label htmlFor="checkbox-change">
          <input
            id="checkbox-change"
            type="checkbox"
            checked={watching.change}
            onChange={(e) => {
              handleSetWatching(["change", e.target.checked]);
            }}
          />
          change
        </label>
        <label htmlFor="checkbox-keyDown">
          <input
            id="checkbox-keyDown"
            type="checkbox"
            checked={watching.keyDown}
            onChange={(e) => {
              handleSetWatching(["keyDown", e.target.checked]);
            }}
          />
          keyDown
        </label>
        <label htmlFor="checkbox-keyUp">
          <input
            id="checkbox-keyUp"
            type="checkbox"
            checked={watching.keyUp}
            onChange={(e) => {
              handleSetWatching(["keyUp", e.target.checked]);
            }}
          />
          keyUp
        </label>
        <label htmlFor="checkbox-composition-start">
          <input
            id="checkbox-composition-start"
            type="checkbox"
            checked={watching.compositionStart}
            onChange={(e) => {
              handleSetWatching(["compositionStart", e.target.checked]);
            }}
          />
          compositionStart
        </label>
        <label htmlFor="checkbox-composition-update">
          <input
            id="checkbox-composition-update"
            type="checkbox"
            checked={watching.compositionUpdate}
            onChange={(e) => {
              handleSetWatching(["compositionUpdate", e.target.checked]);
            }}
          />
          compositionUpdate
        </label>
        <label htmlFor="checkbox-composition-end">
          <input
            id="checkbox-composition-end"
            type="checkbox"
            checked={watching.compositionEnd}
            onChange={(e) => {
              handleSetWatching(["compositionEnd", e.target.checked]);
            }}
          />
          compositionEnd
        </label>
        <label htmlFor="checkbox-input">
          <input
            id="checkbox-input"
            type="checkbox"
            checked={watching.input}
            onChange={(e) => {
              handleSetWatching(["input", e.target.checked]);
            }}
          />
          input
        </label>
        <button
          type="button"
          onClick={() => {
            handleSetWatching(["all", true]);
          }}
        >
          Watch All
        </button>
        <button
          type="button"
          onClick={() => {
            handleSetWatching(["all", false]);
          }}
        >
          Unwatch All
        </button>
        <button
          type="button"
          className={styles.copyButton}
          onClick={() => {
            void handleCopyURL();
          }}
        >
          Copy URL
        </button>
        {copyMessage && <span className={styles.copyMessage}>{copyMessage}</span>}
      </div>
      <form className={styles.form}>
        <input
          type="text"
          onChange={
            watching.change
              ? (e) => {
                  const { isComposing, inputType } =
                    e.nativeEvent as InputEvent;
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "change",
                      text: e.target.value,
                      isComposingEvent: isComposing,
                      type: inputType,
                      id: nextId,
                    }),
                  );
                  updateNextId();
                }
              : undefined
          }
          onKeyDown={
            watching.keyDown
              ? (e) => {
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "keyDown",
                      isComposingEvent: e.nativeEvent.isComposing,
                      text: e.key,
                      id: nextId,
                    }),
                  );
                  updateNextId();
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }
              : undefined
          }
          onKeyUp={
            watching.keyUp
              ? (e) => {
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "keyUp",
                      isComposingEvent: e.nativeEvent.isComposing,
                      text: e.key,
                      id: nextId,
                    }),
                  );
                  updateNextId();
                }
              : undefined
          }
          onCompositionStart={
            watching.compositionStart
              ? (e) => {
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "compositionStart",
                      text: e.data,
                      id: nextId,
                    }),
                  );
                  updateNextId();
                }
              : undefined
          }
          onCompositionUpdate={
            watching.compositionUpdate
              ? (e) => {
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "compositionUpdate",
                      text: e.data,
                      id: nextId,
                    }),
                  );
                  updateNextId();
                }
              : undefined
          }
          onCompositionEnd={
            watching.compositionEnd
              ? (e) => {
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "compositionEnd",
                      text: e.data,
                      id: nextId,
                    }),
                  );
                  updateNextId();
                }
              : undefined
          }
          onInput={
            watching.input
              ? (e) => {
                  const { isComposing, inputType, data } =
                    e.nativeEvent as InputEvent;
                  updateQueue(
                    getUpdatedQueueWithLimit(queue, {
                      name: "input",
                      isComposingEvent: isComposing,
                      type: inputType,
                      id: nextId,
                      text: data,
                    }),
                  );
                  updateNextId();
                }
              : undefined
          }
        />
        <div>
          <button type="reset">Clear Text</button>
          <button onClick={() => updateQueue([])}>Clear Log</button>
        </div>
      </form>
      <ul className={styles.list}>
        {queue.map((e) => (
          <KeyboardEvent key={e.id} state={e} />
        ))}
      </ul>
    </div>
  );
}
