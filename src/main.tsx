import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Safe JSON.stringify monkey-patch to prevent circular reference crashes in localStorage or logs
const originalStringify = JSON.stringify;
JSON.stringify = function (value, replacer, space) {
  try {
    return originalStringify(value, replacer as any, space);
  } catch (err: any) {
    if (err instanceof TypeError && err.message.toLowerCase().includes("circular")) {
      console.warn("Circular reference detected in JSON.stringify. Safely stringifying.", err);
      const cache = new Set();
      return originalStringify(value, (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (cache.has(val)) return "[Circular]";
          cache.add(val);
        }
        return typeof replacer === "function" ? replacer(key, val) : val;
      }, space);
    }
    throw err;
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
