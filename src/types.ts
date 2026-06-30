export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface SafetyGuide {
  id: string;
  title: string;
  englishTitle: string;
  description: string;
  englishDescription: string;
  category: "first-aid" | "safety" | "panic" | "aggression";
  steps: string[];
  englishSteps: string[];
}
