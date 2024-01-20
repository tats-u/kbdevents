"use client";

import { useReducer, useState } from "react";
import styles from "./KeyboardTest.module.scss";
import clsx from "clsx";

type RegisteredKeyboardEntry = (
  | {
      name: "compositionStart" | "compositionUpdate" | "compositionEnd";
      isComposingEvent?: undefined;
      isComposingState?: undefined;
    }
  | {
      name: "change";
      isComposingEvent?: undefined;
      isComposingState: boolean;
    }
  | {
      name: "keyDown";
      isComposingEvent: boolean;
      isComposingState: boolean;
      count?: number;
    }
) & { text: string; id: number };

const maxEventCount = 50;

function getUpdatedQueueWithLimit(
  q: RegisteredKeyboardEntry[],
  value: RegisteredKeyboardEntry
) {
  if (value.name === "keyDown") {
    const first = q[0];
    if (
      first !== undefined &&
      first.name === "keyDown" &&
      value.text === first.text &&
      value.isComposingEvent === first.isComposingEvent &&
      value.isComposingState === first.isComposingState
    ) {
      return [
        { ...first, count: (first.count ?? 1) + 1 },
        ...q.slice(1, maxEventCount),
      ];
    }
  }
  return [value, ...q.slice(0, maxEventCount - 1)];
}

function isComposingEventToString(
  isComposingEvent: boolean | undefined,
  isComposingState: boolean | undefined
) {
  if (!isComposingEvent && !isComposingState) {
    return "";
  }
  return ` (isComposing: ${isComposingEvent ? "[event]" : ""}${
    isComposingState ? "[state]" : ""
  })`;
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
  state: { name, text, isComposingState },
}: {
  state: Extract<RegisteredKeyboardEntry, { name: "change" }>;
}) {
  return (
    <li
      className={clsx(
        styles.listItem,
        isComposingState && styles.otherWhenComposing
      )}
    >
      <EventName name={name} /> <span className={styles.text}>{text}</span>
    </li>
  );
}

function KeyDownEventEntry({
  state: { name, text, isComposingEvent, isComposingState, count },
}: {
  state: Extract<RegisteredKeyboardEntry, { name: "keyDown" }>;
}) {
  return (
    <li
      className={clsx(
        styles.listItem,
        isComposingEvent !== isComposingState
          ? styles.notIntended
          : styles.otherWhenComposing
      )}
    >
      <EventName name={name} /> <kbd>{text}</kbd>
      {isComposingEventToString(isComposingEvent, isComposingState)}
      {(count ?? 1) > 1 && <span className={styles.count}>{count}</span>}
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
      return <KeyDownEventEntry state={state} />;
  }
}

export function KeyboardTest() {
  const [queue, updateQueue] = useState<RegisteredKeyboardEntry[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [nextId, updateNextId] = useReducer(
    (currentId, _?: undefined) => (currentId + 1) & 0xffff,
    0
  );
  return (
    <div>
      <form className={styles.form}>
        <input
          type="text"
          onChange={(e) => {
            updateQueue(
              getUpdatedQueueWithLimit(queue, {
                name: "change",
                text: e.target.value,
                isComposingState: isComposing,
                id: nextId,
              })
            );
            updateNextId();
          }}
          onKeyDown={(e) => {
            updateQueue(
              getUpdatedQueueWithLimit(queue, {
                name: "keyDown",
                isComposingEvent: e.nativeEvent.isComposing,
                isComposingState: isComposing,
                text: e.key,
                id: nextId,
              })
            );
            updateNextId();
          }}
          onCompositionStart={(e) => {
            setIsComposing(true);
            updateQueue(
              getUpdatedQueueWithLimit(queue, {
                name: "compositionStart",
                text: e.data,
                id: nextId,
              })
            );
            updateNextId();
          }}
          onCompositionUpdate={(e) => {
            updateQueue(
              getUpdatedQueueWithLimit(queue, {
                name: "compositionUpdate",
                text: e.data,
                id: nextId,
              })
            );
            updateNextId();
          }}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            updateQueue(
              getUpdatedQueueWithLimit(queue, {
                name: "compositionEnd",
                text: e.data,
                id: nextId,
              })
            );
            updateNextId();
          }}
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
