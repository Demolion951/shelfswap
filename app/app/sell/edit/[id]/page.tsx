import { CreateListingWizard, type EditListingInitial } from "@/components/sell/CreateListingWizard";
import { fetchListingById } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

/**
 * Edit an existing active listing (seller only). Reuses the listing wizard with prefilled data.
 * Location: app/app/sell/edit/[id]/page.tsx
 */
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/app/sell/edit/${id}`)}`);
  }

  const listing = await fetchListingById(id);
  if (!listing || listing.user_id !== user.id || listing.status !== "active") {
    notFound();
  }

  const photos = [...(listing.listing_photos ?? [])].sort((a, b) => a.sort - b.sort);
  const editListing: EditListingInitial = {
    id: listing.id,
    title: listing.title,
    author: listing.author,
    isbn: listing.isbn,
    cover_url: listing.cover_url,
    condition: listing.condition,
    unlock_credits: listing.unlock_credits === 2 ? 2 : 1,
    open_to_swaps: listing.open_to_swaps,
    description: listing.description,
    photos: photos.map((p) => ({ id: p.id, url: p.url, sort: p.sort })),
  };

  return (
    <div className="space-y-4 pt-2">
      <Link href="/app/profile/listings" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Your listings
      </Link>
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Edit listing</h1>
        <p className="text-sm text-base-content/65 mt-1">
          Update details or add more photos — your listing stays live until you delete it.
        </p>
      </div>
      <CreateListingWizard editListing={editListing} />
    </div>
  );
}
