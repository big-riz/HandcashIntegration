import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRedirectUrl } from "@/lib/handcash";
import { SiHandshake } from "react-icons/si";

export default function Home() {
  const handleConnect = () => {
    const redirectUrl = getRedirectUrl();
    window.location.href = redirectUrl;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <SiHandshake className="w-8 h-8 text-primary" />
            <CardTitle className="text-2xl font-bold">Connect HandCash</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center mb-6">
            Connect your HandCash wallet to access your account and make payments
          </p>
          <Button 
            className="w-full font-semibold"
            onClick={handleConnect}
          >
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
