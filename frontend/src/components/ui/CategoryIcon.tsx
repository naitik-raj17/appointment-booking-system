import { Brain, Briefcase, Dumbbell, GraduationCap, HeartPulse, PawPrint, Scale, Scissors, Smile, Sparkles, Stethoscope, Wrench, type LucideIcon } from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  smile: Smile,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  scale: Scale,
  'graduation-cap': GraduationCap,
  brain: Brain,
  'heart-pulse': HeartPulse,
  scissors: Scissors,
  'paw-print': PawPrint,
  wrench: Wrench,
  briefcase: Briefcase,
};

export function CategoryIcon({ icon, className = 'h-5 w-5' }: { icon?: string; className?: string }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Briefcase;
  return <Icon className={className} />;
}
