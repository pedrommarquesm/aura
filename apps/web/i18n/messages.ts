import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

import type { AppLocale } from "./routing";

/**
 * English is the source language, so its catalog is the shape every other
 * catalog has to match. Typing the map against `typeof en` turns a missing
 * Portuguese key into a type error instead of a raw key on the page.
 */
export const catalogs: Record<AppLocale, typeof en> = { en, pt };
