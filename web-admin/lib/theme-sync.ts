/**
 * The platform theme lives on the server (casino_settings.theme) while next-themes
 * keeps a local copy. The initial server sync and the user's own selection can
 * race, so components that change the theme locally mark an override here and the
 * sync skips applying a (possibly stale) server value while that flag is set.
 *
 * Module state resets on a full page reload, which is exactly when the server
 * value should win again.
 */
let userThemeOverride = false

export function markUserThemeOverride(): void {
  userThemeOverride = true
}

export function hasUserThemeOverride(): boolean {
  return userThemeOverride
}
