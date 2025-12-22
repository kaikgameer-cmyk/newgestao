import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <OnboardingModal open={true} />
    </div>
  );
}
