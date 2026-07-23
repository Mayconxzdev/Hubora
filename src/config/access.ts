function explicitlyEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export function accessConfiguration() {
  const requireAuthentication = explicitlyEnabled(import.meta.env.VITE_REQUIRE_AUTH);
  const publicSignupSetting = import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP;
  const guestModeSetting = import.meta.env.VITE_ALLOW_GUEST_MODE;

  return {
    requireAuthentication,
    allowPublicSignup: publicSignupSetting === undefined || publicSignupSetting === ''
      ? !requireAuthentication
      : explicitlyEnabled(publicSignupSetting),
    allowGuestMode: guestModeSetting === undefined || guestModeSetting === ''
      ? !requireAuthentication
      : explicitlyEnabled(guestModeSetting),
  };
}
