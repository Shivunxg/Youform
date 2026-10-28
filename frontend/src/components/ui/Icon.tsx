import { resolveIcon } from '@/lib/icons';
import type { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, size = 18, strokeWidth = 1.75, ...props }: IconProps) {
  const LucideIcon = resolveIcon(name);
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={strokeWidth} {...props} />;
}
