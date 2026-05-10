import { MarketplaceCampaignWorkspace } from '../components/MarketplaceCampaignWorkspace';
import { StripeConnectCallout } from '../components/StripeConnectCallout';
import { useAuth } from '../lib/AuthProvider';

/** Talent-side route: campaign lanes + optional Stripe Connect (same shell as marketplace dashboard). */
export default function MarketplaceWork() {
  const { profile } = useAuth();
  const showStripe =
    profile?.marketplaceRole === 'manager' || profile?.marketplaceRole === 'influencer';

  return (
    <div className="space-y-10 pb-24 max-w-6xl mx-auto">
      {showStripe ? <StripeConnectCallout /> : null}
      <MarketplaceCampaignWorkspace />
    </div>
  );
}
