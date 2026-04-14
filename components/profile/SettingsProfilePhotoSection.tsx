"use client";

/**
 * Client boundary for settings: hosts profile photo uploader (server pages cannot use dynamic ssr:false).
 * Location: components/profile/SettingsProfilePhotoSection.tsx
 */
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";

type Props = {
  initialAvatarUrl: string | null;
  accountLabel: string;
};

export function SettingsProfilePhotoSection({ initialAvatarUrl, accountLabel }: Props) {
  return (
    <ProfileAvatarUploader initialAvatarUrl={initialAvatarUrl} accountLabel={accountLabel} />
  );
}
