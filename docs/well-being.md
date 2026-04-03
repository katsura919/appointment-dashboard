# Well-Being Tracking Feature Plan

## 1. Objective
To implement a holistic well-being tracking system within the dashboard that allows users to log, monitor, and analyze their physical, mental, and emotional health over time.

## 2. Key Aspects to Measure
We will categorize well-being into four core pillars. By keeping the tracking lightweight but multi-dimensional, we increase adherence while gaining valuable insights.

### A. Mental & Emotional Health
*   **Target Metrics:**
    *   **Daily Mood Score:** 1 (Terrible) to 5 (Excellent).
    *   **Stress Level:** 1 (Very Low) to 5 (Overwhelmed).
    *   **Energy Level:** 1 (Exhausted) to 5 (Energized).
    *   **Emotional Tags:** Array of strings (e.g., "Anxious", "Joyful", "Irritable", "Calm") for quick qualitative context.

### B. Physical Health
*   **Target Metrics:**
    *   **Sleep Quantity:** Hours slept.
    *   **Sleep Quality:** 1 (Poor) to 5 (Restorative).
    *   **Activity/Movement:** 1 (Sedentary) to 5 (Highly Active) or minutes of deliberate exercise.
    *   **Hydration/Nutrition Score:** 1 to 5 subjective rating of dietary choices for the day.
    *   **Symptom Tracker:** Optional tags (e.g., "Headache", "Cramps", "Brain Fog").

### C. Social & Family Dynamics (Contextual)
*   **Target Metrics:**
    *   **Relational Harmony:** 1 (High Conflict) to 5 (Deeply Connected).
    *   **Quality Time:** Did the user engage in meaningful connection today? (Boolean).

### D. Qualitative (Journaling)
*   **Target Metrics:**
    *   **Daily Notes/Gratitude:** Free-text field for journaling. Helps provide context to the quantitative data.

---

## 3. Data Interpretation & Analytics
Raw data is only helpful if we can interpret it. The dashboard will analyze the data using the following methodologies:

### A. Trend Analysis (The "Moving Average")
*   **What it does:** Calculates 7-day and 30-day rolling averages for Mood, Stress, and Sleep.
*   **Why it matters:** Smoothing out daily spikes helps identify broader trajectories (e.g., sliding into a depressive episode or slowly burning out).

### B. Correlation Engine
*   **What it does:** Cross-references different metrics to find personal triggers and benefits.
*   **Examples:**
    *   *Sleep vs. Stress:* "On days you sleep < 6 hours, your stress level is 40% higher."
    *   *Movement vs. Mood:* "Your mood score averages 4.5 on days you log high physical activity."

### C. Early Warning Framework (Threshold Alerts)
*   **What it does:** Flags periods of sustained low well-being.
*   **Examples:**
    *   If Mood <= 2 for 3 consecutive days, trigger a gentle prompt: *"It looks like it's been a tough few days. Remember to take a moment for yourself."*
    *   If Stress >= 4 for 5 consecutive days, suggest a schedule review to reduce load.

### D. Visualizations
*   **Mood Heatmap:** A GitHub-style contribution calendar showing mood intensity over the year.
*   **Radar/Spider Chart:** A weekly snapshot comparing Physical, Mental, and Social scores to see which area is being neglected.
*   **Overlay Line Charts:** Plotting Stress against Sleep on the same graph to visually demonstrate their relationship.

---

## 4. Proposed Data Schema (Mongoose / TypeScript)

```typescript
import mongoose, { Schema, Document, Model } from "mongoose"

export interface IWellBeingLog extends Document {
  userId: mongoose.Types.ObjectId
  date: Date
  metrics: {
    moodScore?: number       // 1-5
    stressLevel?: number     // 1-5
    energyLevel?: number     // 1-5
    sleepHours?: number      
    sleepQuality?: number    // 1-5
    activityLevel?: number   // 1-5
    hydrationScore?: number  // 1-5
  }
  tags?: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const WellBeingLogSchema = new Schema<IWellBeingLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    metrics: {
      moodScore: { type: Number, min: 1, max: 5 },
      stressLevel: { type: Number, min: 1, max: 5 },
      energyLevel: { type: Number, min: 1, max: 5 },
      sleepHours: { type: Number, min: 0, max: 24 },
      sleepQuality: { type: Number, min: 1, max: 5 },
      activityLevel: { type: Number, min: 1, max: 5 },
      hydrationScore: { type: Number, min: 1, max: 5 },
    },
    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

// Index for efficient querying by user and date sorting
WellBeingLogSchema.index({ userId: 1, date: -1 })
```

## 5. Next Steps for Implementation
1.  **Review & Refine:** Review this plan to ensure these metrics align with what you actually want to track. Keep it simple; too many mandatory fields will cause tracking fatigue.
2.  **Database Layer:** Create the `WellBeingLog` Mongoose schema and API routes (CRUD operations).
3.  **UI Data Entry:** Build a friction-free, mobile-friendly daily check-in UI (e.g., sliders and emojis).
4.  **UI Dashboard:** Build the analytics view with charts (using a library like Recharts or Chart.js).
