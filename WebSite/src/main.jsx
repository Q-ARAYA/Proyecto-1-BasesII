import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#165d53", dark: "#10473f", light: "#e4f1ed" },
    secondary: { main: "#d58a46" },
    background: { default: "#f4f6f3", paper: "#ffffff" },
    text: { primary: "#1f2c2a", secondary: "#74807c" },
    error: { main: "#bd4f45" },
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "Manrope, sans-serif", fontWeight: 800, letterSpacing: "-0.045em" },
    h2: { fontFamily: "Manrope, sans-serif", fontWeight: 800, letterSpacing: "-0.035em" },
    h3: { fontFamily: "Manrope, sans-serif", fontWeight: 750, letterSpacing: "-0.03em" },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 10, boxShadow: "none" } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, color: "#68736f", background: "#f7f9f7" } } },
  },
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider>
  </React.StrictMode>,
);
