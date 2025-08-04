import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Vite HMR WebSocket connection errors in development
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('WebSocket') || message.includes('DOMException')) {
      return; // Suppress Vite HMR WebSocket warnings
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('WebSocket') || message.includes('DOMException')) {
      return; // Suppress Vite HMR WebSocket errors
    }
    originalError.apply(console, args);
  };
  
  // Handle unhandled promise rejections related to WebSocket
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';
    if (reason.includes('WebSocket') || reason.includes('DOMException')) {
      event.preventDefault(); // Prevent the error from showing in console
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
