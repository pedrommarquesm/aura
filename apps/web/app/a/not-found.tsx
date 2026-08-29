import { getTranslations } from "next-intl/server";

import { PublicPostUnavailable } from "@/components/public-post";

export default async function ShareNotFound() {
  const t = await getTranslations("post.page");
  return <PublicPostUnavailable message={t("unavailable")} />;
}
