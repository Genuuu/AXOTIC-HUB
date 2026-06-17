/**
 * Helper utility to determine if a given birthday string (in various formats)
 * matches the current local system month and day.
 */
export function checkIsTodayBirthday(birthday?: string): boolean {
  if (!birthday) return false;
  try {
    const parts = birthday.replace(/[\/\s]/g, "-").split("-");
    if (parts.length >= 3) {
      let month = 0;
      let day = 0;
      const num1 = parseInt(parts[0], 10);
      const num2 = parseInt(parts[1], 10);
      const num3 = parseInt(parts[2], 10);

      if (num1 > 1000) {
        // YYYY-MM-DD
        month = num2;
        day = num3;
      } else if (num3 > 1000) {
        // MM-DD-YYYY or DD-MM-YYYY
        if (num1 > 12) {
          day = num1;
          month = num2;
        } else {
          month = num1;
          day = num2;
        }
      } else {
        month = num2;
        day = num3;
      }

      const today = new Date();
      return (today.getMonth() + 1) === month && today.getDate() === day;
    }
  } catch (_) {}
  return false;
}
