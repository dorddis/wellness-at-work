# Lumina - Intelligent Wellness Companion

**Submitted to:** Ishaan Gupta & Mehul Bhardwaj  
**Context:** Founding App Developer Assignment - Wellness at Work

---

## 🚀 Project Overview

**Lumina** is a next-generation desktop application designed to improve digital well-being for knowledge workers. Built as a response to the "Wellness at Work" challenge, it transforms a simple blink detector into a comprehensive, privacy-first AI coach.

Unlike traditional trackers, Lumina processes all video feeds locally on the "Edge" (the user's device), ensuring that sensitive biometric data never leaves the computer. It combines real-time computer vision with a modern, unobtrusive UI to prevent eye strain and burnout.

## ✨ Key Features

- **🛡️ Privacy-First Edge AI:** Uses MediaPipe & TensorFlow.js to analyze facial landmarks locally. No video stream is ever uploaded to the cloud.
- **👁️ Advanced Blink & Fatigue Detection:** Goes beyond simple counting. Analyzes blink duration and frequency to detect genuine fatigue.
- **🧘 Posture Correction:** Real-time feedback when users slouch or lean too close to the screen.
- **🔕 Intelligent Meeting Mode:** Automatically detects active video calls and pauses alerts to prevent interruptions.
- **☁️ Offline-First Sync:** Built with a local SQLite database that seamlessly syncs with the cloud when internet is available, ensuring zero data loss.
- **🎨 Modern Aesthetic:** A polished, dark-themed UI built with React & Tailwind CSS, designed to feel native on Windows and macOS.

## 📂 Repository Structure

This repository is organized into three main sections:

### 1. `lumina/` (The Application)
A production-grade **Turbo Monorepo** containing the full-stack implementation.
- **`apps/desktop`**: The main Electron application (React + Vite + MediaPipe).
- **`apps/web`**: The web dashboard (Next.js) for analytics and reports.
- **`packages/core`**: Shared business logic and state management.
- **`packages/api`**: Backend API definitions and types.

### 2. `docs/` (Architecture & Product)
Comprehensive documentation covering technical decisions and product strategy.
- **`architecture/`**: Deep dives into Event-Driven Architecture, Time-Series storage, and Edge-AI implementation.
- **`product/`**: Competitor analysis, scaling challenges (1k to 100k users), and feature specifications.

### 3. `experiments/` (R&D)
Initial Python prototypes used to validate computer vision algorithms before porting to the robust TypeScript production environment.
- Contains `blink_detector.py` and robust detection scripts.

## 🛠️ Quick Start

To run the **Lumina Desktop** application:

### Prerequisites
- Node.js (v18 or higher)
- pnpm (`npm install -g pnpm`)

### Installation & Run

1. Navigate to the application root:
   ```bash
   cd lumina
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the desktop application (Development Mode):
   ```bash
   pnpm dev
   ```
   *This will launch the Electron app with hot-reload enabled.*

## 🏗️ Architecture Highlights

For this assignment, we chose a **Hybrid Desktop Architecture**:

- **Frontend:** Electron + React (for a rich, responsive UI and native OS integration).
- **AI Engine:** On-device inference using WASM/Native Modules (performance comparable to native C++).
- **Data Layer:** Local-first SQLite database with background synchronization to Supabase/PostgreSQL.

This approach offers the best balance of **performance**, **privacy**, and **developer velocity**, allowing for rapid iteration without compromising on the "Founding Engineer" quality standards.

---
*Generated for the Wellness at Work Evaluation Process - Dec 2025*
