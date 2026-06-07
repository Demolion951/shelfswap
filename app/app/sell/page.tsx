import { GuestAccountPrompt } from "@/components/auth/GuestAccountPrompt";
import { CreateListingWizard } from "@/components/sell/CreateListingWizard";
import { getOptionalUser } from "@/lib/auth/requireUser";
import { PlusCircle } from "lucide-react";

export default async function SellPage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <GuestAccountPrompt
        title="List a book"
        description="Create a free account to list books on ShelfSwap and start swapping with readers near you."
        Icon={PlusCircle}
        returnTo="/app/sell"
      />
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">List a book</h1>
      </div>
      <CreateListingWizard />
    </div>
  );
}
