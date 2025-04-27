import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";
import AppWrapper from "./AppWrapper";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" attribute="class">
      <AppWrapper />
      <Toaster />
    </ThemeProvider>
  </StrictMode>,
);
