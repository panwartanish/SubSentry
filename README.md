# 🛡️ SubSentry - The Subscription Tracker

> **"Secure your budget. Stop the subscription creep."**

**SubSentry** is a specialized dashboard designed for the "Budget-Conscious Professional." It helps users manually log, track, and visualize their recurring expenses to prevent forgotten free trials and "vampire costs."

![Vibe Coded Badge](https://img.shields.io/badge/Vibe%20Coded-Emerald%20Green-10B981)
![Status](https://img.shields.io/badge/Status-MVP%20Complete-success)
![Tech Stack](https://img.shields.io/badge/Tech-React%20%7C%20Vite%20%7C%20LocalStorage-blue)

## 🚀 Live Demo
**[View the Live MVP Here](https://comma-native-64429766.figma.site)**

---

## 🧐 The Problem
Professionals today subscribe to dozens of tools (Netflix, Spotify, Canva, Gym). It is easy to lose track of renewal dates, leading to:
* **"Vampire Costs":** Small, forgotten charges that drain monthly budgets.
* **Trial Anxiety:** Forgetting to cancel 7-day free trials.
* **Fragmentation:** No single source of truth for recurring expenses.

## 💡 The Solution
**SubSentry** provides a centralized "Reality Check" dashboard.
* **Visualizes** total monthly spending immediately.
* **Sorts** subscriptions by the next renewal date.
* **Persists** data locally so you stay organized without complex setups.

---

## ✨ Key Features
* **🔐 Simulated Authentication:** A secure-feeling login flow (MVP version) that personalizes the user experience.
* **📊 Reality Check Dashboard:** Dynamic "Total Monthly Cost" calculator that updates instantly as you add items.
* **💾 Persistent Tracking:** Uses `localStorage` to save your data—refresh the page, and your budget remains intact.
* **🎨 "Empowering" UI Design:** Built with a custom "Emerald Green" (#10B981) design system to evoke financial growth and security.
* **📱 Fully Responsive:** Works seamlessly on mobile and desktop.

---

## 🛠️ Tech Stack
* **Frontend:** React.js (Vite)
* **Styling:** CSS3 (Custom Vibe-Coded Variables)
* **State Management:** React Hooks (`useState`, `useEffect`)
* **Persistence:** Browser LocalStorage (Client-Side Only)

---

## 🤖 Methodology (Prompt Engineering)
This project was built using the **4D Framework (Discover, Define, Develop, Deliver)** assisted by advanced Prompt Engineering techniques documented in the Methodology Appendix:
1.  **Role-Playing:** Used to generate the specific "Alex the Optimizer" user persona.
2.  **Chain-of-Thought:** Used to break down the "Vampire Cost" problem into actionable user stories.
3.  **Vibe Coding:** Used "Adjective Prompting" to generate the *Secure & Empowering* Emerald Green theme.
4.  **Constraint-Based Prompting:** restricted the MVP to LocalStorage to ensure functional delivery without backend dependencies.

---

## ⚙️ Installation & Run Locally

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/SubSentry.git](https://github.com/YOUR_USERNAME/SubSentry.git)
    ```

2.  **Navigate to the project folder**
    ```bash
    cd SubSentry
    ```

3.  **Install dependencies**
    ```bash
    npm install
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

---

## 🔮 Future Roadmap
* [ ] **Cloud Sync:** Migrate from LocalStorage to Supabase (PostgreSQL) for cross-device syncing.
* [ ] **Email Alerts:** Integration with SendGrid for 2-day renewal warnings.
* [ ] **OAuth:** Real Google Login implementation.

---

*Submitted by Tanish Panwar as part of the End Module-5 Project @ Masai.*