import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware `next/navigation`. `Link` and `getPathname` translate an
 * internal pathname such as `/about` into `/about` or `/pt/sobre`, so no
 * component has to know a localized URL.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
