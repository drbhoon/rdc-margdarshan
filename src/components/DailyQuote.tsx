"use client";
import { useSyncExternalStore } from "react";
const quotes = [
  [
    "A small step, practised daily, becomes a lasting strength.",
    "रोज़ अभ्यास किया गया छोटा कदम स्थायी ताकत बनता है।",
  ],
  [
    "Ask one thoughtful question. Make room for a new perspective.",
    "एक सोच-समझकर सवाल पूछें। नए दृष्टिकोण के लिए जगह बनाएं।",
  ],
  [
    "Progress grows when learning becomes action.",
    "जब सीख कार्य में बदलती है, तब प्रगति होती है।",
  ],
  [
    "Listen to understand, then work together to improve.",
    "समझने के लिए सुनें, फिर सुधार के लिए मिलकर काम करें।",
  ],
  [
    "Good teams make it easier to ask for help.",
    "अच्छी टीम में मदद मांगना आसान होता है।",
  ],
  [
    "Reflect on today. Choose one thing to improve tomorrow.",
    "आज पर विचार करें। कल सुधारने के लिए एक बात चुनें।",
  ],
  [
    "Share your experience. Someone else can grow from it.",
    "अपना अनुभव साझा करें। उससे कोई और सीख सकता है।",
  ],
];
const subscribe = (notify: () => void) => {
  const timer = setInterval(notify, 60000);
  return () => clearInterval(timer);
};
const currentDay = () => Math.floor((Date.now() + 19800000) / 86400000) % 7;
export function DailyQuote() {
  const index = useSyncExternalStore(subscribe, currentDay, () => -1);
  if (index < 0) return null;
  return (
    <aside className="card" style={{ background: "#152e48", color: "white" }}>
      <p style={{ fontSize: 12, letterSpacing: 2 }}>
        TODAY’S THOUGHT · आज का विचार
      </p>
      <p style={{ fontSize: 22, margin: "12px 0" }}>{quotes[index][0]}</p>
      <p lang="hi">{quotes[index][1]}</p>
      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>
        Margdarshan reflections
      </p>
    </aside>
  );
}
