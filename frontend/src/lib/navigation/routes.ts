/** App routes for portal pages (`src/app/pages/`) and home (`src/app/home/`). */
export const pages = {
  home: "/home",
  verify: "/pages/verify",
  student: "/pages/student",
  professor: "/pages/professor",
  issuer: "/pages/issuer",
  admin: "/pages/admin",
} as const;

export type PagesRoute = (typeof pages)[keyof typeof pages];
