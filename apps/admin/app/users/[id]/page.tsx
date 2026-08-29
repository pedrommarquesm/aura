import { Shell } from "@/components/shell";

import { UserDetail } from "./user-detail";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Shell>
      <UserDetail userId={id} />
    </Shell>
  );
}
