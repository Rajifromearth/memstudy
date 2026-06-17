"use client";

import { useState, useRef, useEffect } from "react";

const BRANCHES = [
  { id: "main",        label: "General",     icon: "◈" },
  { id: "mathematics", label: "Mathematics", icon: "∑" },
  { id: "physics",     label: "Physics",     icon: "⚛" },
  { id: "history",     label: "History",     icon: "📜" },
  { id: "programming", label: "Programming", icon: "{ }" },
  { id: "biology",     label: "Biology",     icon: "🧬" },
];

const STARTERS = [
  "Give me an overview of key concepts in this subject",
  "Quiz me on what we covered last session",
  "Explain the hardest topic in this subject simply",
  "What should I study next?",
];

type Message = { role: "user" | "assistant"; content: string };

export default function StudyAssistant() {
  const [branch, setBranch] = useState("main");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentBranch = BRANCHES.find((b) => b.id === branch)!;

  async function sendMessage(text?: string) {
    const userText = text || input.trim();
    if (!userText || isLoading) return;

    const userMsg: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, branch }),
      });

      if (!res.ok) throw new Error("Request failed");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: aiText }]);
      }
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={s.root}>
      <aside style={{ ...s.sidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-260px)" }}>
        <div style={s.sidebarHeader}>
          <span style={s.logo}>◈ StudyMind</span>
          <button style={s.iconBtn} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <p style={s.sectionLabel}>SUBJECT BRANCHES</p>
        <div style={s.branchList}>
          {BRANCHES.map((b) => (
            <button key={b.id} onClick={() => { setBranch(b.id); setSidebarOpen(false); }}
              style={{ ...s.branchBtn,
                background: branch === b.id ? "rgba(124,106,247,0.15)" : "transparent",
                color: branch === b.id ? "#e8e9ed" : "#9295a0",
                border: branch === b.id ? "1px solid rgba(124,106,247,0.4)" : "1px solid transparent",
              }}>
              <span>{b.icon}</span>
              <span>{b.label}</span>
              {branch === b.id && <span style={s.dot} />}
            </button>
          ))}
        </div>
        <p style={s.memNote}>💡 MemForks saves memory per branch</p>
      </aside>

      {sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)} />}

      <div style={s.main}>
        <header style={s.topbar}>
          <button style={s.iconBtn} onClick={() => setSidebarOpen(true)}>☰</button>
          <span style={s.pill}>{currentBranch.icon} {currentBranch.label}</span>
          <span style={s.memBadge}>● memory active</span>
        </header>

        <div style={s.chatArea}>
          {messages.length === 0 ? (
            <div style={s.welcome}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{currentBranch.icon}</div>
              <h1 style={s.welcomeTitle}>What are we studying today?</h1>
              <p style={s.welcomeSub}>I remember our past sessions in <strong>{currentBranch.label}</strong>. Pick up where we left off.</p>
              <div style={s.starters}>
                {STARTERS.map((st) => (
                  <button key={st} style={s.starterBtn} onClick={() => sendMessage(st)}>{st}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={s.messages}>
              {messages.map((m, i) => (
                <div key={i} style={{ ...s.row, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && <div style={s.aiAvatar}>{currentBranch.icon}</div>}
                  <div style={{ ...s.bubble,
                    background: m.role === "user" ? "#1e2340" : "#16181c",
                    borderBottomRightRadius: m.role === "user" ? 4 : 12,
                    borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
                  }}>
                    <p style={s.roleLabel}>{m.role === "user" ? "You" : "StudyMind"}</p>
                    <p style={s.msgText}>{m.content || "▋"}</p>
                  </div>
                  {m.role === "user" && <div style={s.userAvatar}>U</div>}
                </div>
              ))}
              {isLoading && messages[messages.length-1]?.role !== "assistant" && (
                <div style={{ ...s.row, justifyContent: "flex-start" }}>
                  <div style={s.aiAvatar}>{currentBranch.icon}</div>
                  <div style={{ ...s.bubble, background: "#16181c" }}>
                    <p style={s.roleLabel}>StudyMind</p>
                    <p style={{ ...s.msgText, color: "#6b6f7c" }}>Thinking…</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div style={s.inputArea}>
          <div style={s.inputWrapper}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${currentBranch.label}…`}
              rows={1} style={s.textarea}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            />
            <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()}
              style={{ ...s.sendBtn, background: isLoading || !input.trim() ? "#2a2d35" : "#7c6af7" }}>
              ↑
            </button>
          </div>
          <p style={s.hint}>Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", height: "100vh", background: "#0e0f11", color: "#e8e9ed", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden", position: "relative" },
  sidebar: { position: "fixed", top: 0, left: 0, height: "100vh", width: 260, background: "#16181c", borderRight: "1px solid #2a2d35", display: "flex", flexDirection: "column", zIndex: 50, transition: "transform 0.25s ease", padding: "0 0 20px" },
  sidebarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px", borderBottom: "1px solid #2a2d35" },
  logo: { fontSize: 17, fontWeight: 600 },
  sectionLabel: { fontSize: 10, letterSpacing: "0.12em", color: "#6b6f7c", fontWeight: 600, padding: "16px 16px 8px" },
  branchList: { display: "flex", flexDirection: "column", gap: 2, padding: "0 10px", flex: 1 },
  branchBtn: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#7c6af7", marginLeft: "auto" },
  memNote: { fontSize: 11, color: "#6b6f7c", padding: "16px", borderTop: "1px solid #2a2d35", marginTop: 8 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 },
  main: { flex: 1, display: "flex", flexDirection: "column", height: "100vh" },
  topbar: { display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #2a2d35", gap: 12, flexShrink: 0 },
  iconBtn: { background: "none", border: "none", color: "#9295a0", cursor: "pointer", fontSize: 18, padding: 4 },
  pill: { background: "rgba(124,106,247,0.15)", border: "1px solid rgba(124,106,247,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#a78bfa", fontWeight: 500 },
  memBadge: { marginLeft: "auto", fontSize: 11, color: "#7c6af7" },
  chatArea: { flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column" },
  welcome: { maxWidth: 540, margin: "auto", textAlign: "center", padding: "40px 0" },
  welcomeTitle: { fontSize: 28, fontWeight: 400, marginBottom: 12, fontFamily: "Georgia, serif" },
  welcomeSub: { color: "#9295a0", fontSize: 14, lineHeight: 1.7, marginBottom: 28 },
  starters: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  starterBtn: { background: "#16181c", border: "1px solid #2a2d35", borderRadius: 10, color: "#9295a0", cursor: "pointer", fontSize: 13, padding: "11px 14px", textAlign: "left", fontFamily: "inherit", lineHeight: 1.4 },
  messages: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, width: "100%", margin: "0 auto" },
  row: { display: "flex", alignItems: "flex-end", gap: 10 },
  aiAvatar: { width: 32, height: 32, borderRadius: 8, background: "rgba(124,106,247,0.15)", border: "1px solid rgba(124,106,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 },
  userAvatar: { width: 32, height: 32, borderRadius: 8, background: "#1e2340", border: "1px solid #2a2d35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9295a0", flexShrink: 0 },
  bubble: { maxWidth: "78%", padding: "12px 16px", borderRadius: 12, border: "1px solid #2a2d35", display: "flex", flexDirection: "column", gap: 4 },
  roleLabel: { fontSize: 11, color: "#6b6f7c", margin: 0 },
  msgText: { fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" },
  inputArea: { padding: "14px 20px 20px", borderTop: "1px solid #2a2d35", flexShrink: 0 },
  inputWrapper: { display: "flex", alignItems: "flex-end", gap: 10, background: "#16181c", border: "1px solid #2a2d35", borderRadius: 12, padding: "10px 10px 10px 16px", maxWidth: 720, margin: "0 auto" },
  textarea: { flex: 1, background: "none", border: "none", outline: "none", color: "#e8e9ed", fontFamily: "inherit", fontSize: 15, lineHeight: 1.5, resize: "none", maxHeight: 140 },
  sendBtn: { width: 36, height: 36, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 700, flexShrink: 0, transition: "background 0.15s" },
  hint: { fontSize: 11, color: "#6b6f7c", textAlign: "center", marginTop: 8 },
};