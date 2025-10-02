
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

const Waitlist = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Stratus</h1>
          <p className="text-xl text-muted-foreground">
            The future of project management is coming soon
          </p>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Join thousands of teams waiting for a smarter, more intuitive way to manage their projects. 
            Be among the first to experience Stratus when we launch.
          </p>
        </div>
        
        <LeadCaptureForm />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>We respect your privacy. No spam, just updates.</p>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
