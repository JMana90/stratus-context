
import { Header } from "@/components/Header";
import { PricingPlans } from "@/components/PricingPlans";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-6 py-12">
        <PricingPlans />
      </div>
    </div>
  );
};

export default Pricing;
