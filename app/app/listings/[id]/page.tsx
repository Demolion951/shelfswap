import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { fetchListingById } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await fetchListingById(id);
  if (!listing || listing.status !== "active") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === listing.user_id;

  return <ListingDetailView listing={listing} isOwner={isOwner} />;
}
