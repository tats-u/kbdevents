import styles from "./page.module.css";
import { KeyboardTest } from "../components/KeyboardTest";

export default function Home() {
  return (
    <>
      <header>
        <h1>Keyboard Events Test Page</h1>
      </header>
      <main>
        <p>
          This page allows you to test keyboard events including IME-related
          ones.
        </p>
        <p>
          Note:{" "}
          <a
            href="https://react.dev/reference/react-dom/components/input#props"
            target="_blank"
          >
            React uses the native onInput event to implement its onChange event.
          </a>
        </p>
        <KeyboardTest />
      </main>
      <footer>
        <p className={styles.credit}>
          Developed by{" "}
          <a href="https://github.com/tats-u" target="_blank" rel="noreferrer">
            Tatsunori Uchino (@tats-u)
          </a>
        </p>
      </footer>
    </>
  );
}
