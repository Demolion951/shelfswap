import { CreateListingWizard } from "@/components/sell/CreateListingWizard";

export default function SellPage() {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">List a book</h1>
        <p className="text-sm text-base-content/65">
          Look up by ISBN (catalogue cover), optionally add photos of your copy, then set condition
          and credits to unlock — buyers browse for free.
        </p>
      </div>
      <CreateListingWizard />
    </div>
  );
}
