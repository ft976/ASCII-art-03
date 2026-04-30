# ASCII Canvas 🎨

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Performance](https://img.shields.io/badge/performance-600_FPS-orange.svg)
![Contributors](https://img.shields.io/badge/contributors-1-blue.svg)

> *"To paint with characters is to distill the image into its fundamental soul, weaving light from the quiet geometry of code, where every pixel is a whisper, and every whisper, a masterpiece."*

**ASCII Canvas** is a high-fidelity, browser-native atelier designed for digital artists to sculpt light, shadow, and code into mesmerizing ASCII art. This project represents a fusion of vintage aesthetics and modern, ultra-high-performance processing.

Developed and maintained exclusively by [**Rehan97**](https://www.linkedin.com/in/rehan-ahmad-863386382?utm_source=share_via&utm_content=profile&utm_medium=member_android).

---

## 📖 Table of Contents
- [✨ Core Features](#-core-features)
- [🔬 Core Concepts & Technical Deep Dive](#-core-concepts--technical-deep-dive)
- [🚀 Performance Engineering (The 600 FPS Engine)](#-performance-engineering-the-600-fps-engine)
- [🎨 User Interface & Experience Design](#-user-interface--experience-design)
- [📽️ Professional Export Suite](#-professional-export-suite)
- [🛠️ Technical Stack](#-technical-stack)
- [📂 Project Architecture](#-project-architecture)
- [✒️ The Team](#-the-team)
- [📜 License](#-license)

---

## ✨ Core Features

### 🚀 High-Performance Engine
- **Ultra-Responsive Processing**: A specialized rendering pipeline designed to handle high-resolution video streams in real-time.
- **Privacy-Centric (Local-First)**: 100% client-side computation. Your creative assets never leave your browser, ensuring total data security and zero server latency.
- **Hardware-Optimized**: Direct interaction with the HTML5 Canvas API using `willReadFrequently` flags for low-level memory access optimization.

### 🎨 State-of-the-Art Artistry
- **Multi-Level Complexity**: Toggle between high-contrast minimalist sets (10 characters) and hyper-detailed tonal sets (70 characters).
- **Dynamic Chromatic Mapping**: Preserves the original color profile of source media, applying precise RGB data to every individual character.
- **Adaptive Resolution**: Locked to a professional 150-column standard to ensure horizontal fidelity while maintaining manageable text dimensions.

### 📽️ Unified Exporting
- **Stills**: High-resolution `.png` capture of the ASCII result.
- **Motion**: Direct recording of the canvas stream at native **600 FPS** into the `.webm` format.
- **Code**: Export as raw `.txt` or as a portable, self-contained `.html` gallery.

---

## 🔬 Core Concepts & Technical Deep Dive

### 1. Pixel Downsampling & Luminosity Extraction
The engine does not just "replace" pixels. It performs a sophisticated downsampling of the original media:
- The input frame is divided into a grid of "cells".
- For each cell, the engine calculates the average RGB color by iterating through the pixel buffer.
- We then apply the **Luminosity Formula**: `Gray = (0.2989 * R) + (0.5870 * G) + (0.1140 * B)`.
- This formula mirrors how the human eye perceives brightness cross-chromatically, ensuring the ASCII art looks "naturally" lit.

### 2. Character Mapping Algorithm
Brightness values (0-255) are normalized and mapped to an index in a character string.
- In **Simple Mode**, every ~25 units of brightness switch the character.
- In **Complex Mode**, every ~3.6 units of brightness switch the character, allowing for incredible depth and texture that mimics a 50-year-old CRT monitor or a high-end charcoal sketch.

---

## 🚀 Performance Engineering (The 600 FPS Engine)

Standard web applications are limited to 60 or 120 FPS by the browser's refresh rate. **ASCII Canvas** breaks this limitation.

### Recursive setTimeout vs requestAnimationFrame
While `requestAnimationFrame` is great for UI fluidity, it forces a sync with the monitor's refresh rate. For a tool designed to record high-fidelity motion, we implemented a recursive, asynchronous `setTimeout` loop.

By targeting a **1.6ms interval** (`1000ms / 600FPS`), we ensure that the internal processing buffer is always saturated with fresh frame data. This minimizes "ghosting" during recordings and provides a near-instantaneous creative response for the artist.

---

## 🎨 User Interface & Experience Design

### The "Atelier" Aesthetic
We avoided standard "dashboard" look-and-feel. Instead, we built an **Atelier**:
- **Brutalist Minimalism**: High contrast, ultra-dark backgrounds, and subtle monochromatic borders.
- **Information Density**: Controls are grouped logically into "Image Source" and "Configuration," allowing the art to remain the focus.
- **Custom Scroll Engineering**: Tailored scrollbars designed to blend into the darkness of the workspace.

---

## 🛠️ Technical Stack

- **Framework**: `React 18` for reactive state-based UI.
- **Language**: `TypeScript` for robust, scalable pixel-manipulation logic.
- **Styling**: `Tailwind CSS` with `@import "tailwindcss"` for modern, modular styles.
- **Icons**: `Lucide React` for sharp, minimal visual cues.
- **UI Components**: `Radix UI` and `Shadcn UI` patterns for refined interactive elements.
- **Recording**: `MediaStream Recording API` for high-speed video capture.

---

## 📂 Project Architecture

```text
├── src/
│   ├── components/       # Visual foundation components
│   ├── lib/              # Utility functions and helper logic
│   ├── App.tsx           # The Core Engine (Rendering, State, Recording)
│   ├── main.tsx          # React bootstrapping
│   └── index.css         # Custom atelier styling
├── LICENSE               # Official MIT Agreement
└── README.md             # Detailed Project Architecture (The "Blue Book")
```

---

## ✒️ The Team

ASCII Canvas is a collaborative masterpiece built with passion by:

- [**Rehan97**](https://www.linkedin.com/in/rehan-ahmad-863386382?utm_source=share_via&utm_content=profile&utm_medium=member_android) - Creator

---

## 📜 License

This project is licensed under the **MIT License**.

Copyright (c) 2026 **Rehan97**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
