import { CreateListingWizard } from "@/components/sell/CreateListingWizard";

export default function SellPage() {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">List a book</h1>
      </div>
      <CreateListingWizard />
    </div>
  );
}
