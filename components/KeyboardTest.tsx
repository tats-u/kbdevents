"use client";

import { useReducer, useState } from "react";
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

export function KeyboardTest() {
  const [queue, updateQueue] = useState<RegisteredKeyboardEntry[]>([]);
  // const [isComposing, setIsComposing] = useState(false);
  const [watching, setWatching] = useReducer(
    (
      current: WatchingState,
      [name, value]: [keyof WatchingState | "all", boolean],
    ) => {
      if (name === "all") {
        return {
          change: value,
          keyDown: value,
          keyUp: value,
          compositionStart: value,
          compositionUpdate: value,
          compositionEnd: value,
          input: value,
        };
      }
      return { ...current, [name]: value };
    },
    {
      change: true,
      keyDown: true,
      keyUp: true,
      compositionStart: true,
      compositionUpdate: true,
      compositionEnd: true,
      input: true,
    },
  );

  const [nextId, updateNextId] = useReducer(
    (currentId, _?: undefined) => (currentId + 1) & 0xffff,
    0,
  );
  return (
    <div>
      <div className={styles.togglesContainer}>
        <label htmlFor="checkbox-change">
          <input
            id="checkbox-change"
            type="checkbox"
            checked={watching.change}
            onChange={(e) => {
              setWatching(["change", e.target.checked]);
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
              setWatching(["keyDown", e.target.checked]);
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
              setWatching(["keyUp", e.target.checked]);
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
              setWatching(["compositionStart", e.target.checked]);
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
              setWatching(["compositionUpdate", e.target.checked]);
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
              setWatching(["compositionEnd", e.target.checked]);
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
              setWatching(["input", e.target.checked]);
            }}
          />
          input
        </label>
        <button
          type="button"
          onClick={() => {
            setWatching(["all", true]);
          }}
        >
          Watch All
        </button>
        <button
          type="button"
          onClick={() => {
            setWatching(["all", false]);
          }}
        >
          Unwatch All
        </button>
      </div>
      <form className={styles.form}>
        <input
          type="text"
          onChange={
            watching.change
              ? (e) => {
                  const { isComposing, inputType, data } =
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
