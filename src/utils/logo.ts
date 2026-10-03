export const DEFAULT_DARK_BLUE_LOGO = "/logo.png";
export const DEFAULT_WHITE_LOGO = "/white_logo.png";

/**
 * Resolves the appropriate logo URL for the current visual context.
 *
 * @param customLogoUrl - Custom uploaded or configured logo URL from workspace settings
 * @param isDarkContext - True if the logo is rendered over a dark surface (e.g., sidebar, modal header, or dark mode)
 */
export function getWorkspaceLogo(customLogoUrl?: string | null, isDarkContext: boolean = false): string {
  if (
    customLogoUrl &&
    customLogoUrl.trim() !== "" &&
    customLogoUrl !== DEFAULT_DARK_BLUE_LOGO &&
    customLogoUrl !== DEFAULT_WHITE_LOGO &&
    customLogoUrl !== "/AXOTIC Logo-1.png"
  ) {
    return customLogoUrl;
  }
  return isDarkContext ? DEFAULT_WHITE_LOGO : DEFAULT_DARK_BLUE_LOGO;
}
