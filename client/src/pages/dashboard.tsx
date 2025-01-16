import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LogOut, User, Wallet2 } from "lucide-react";
import { HandCashProfile } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading, error } = useQuery<HandCashProfile>({
    queryKey: ['/api/profile'],
    retry: false,
  });

  // Handle unauthenticated state
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load profile. Please try connecting again.",
      variant: "destructive"
    });
    setLocation('/');
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    setLocation('/');
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={profile.publicProfile.avatarUrl} alt={profile.publicProfile.displayName} />
              <AvatarFallback>{profile.publicProfile.displayName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile.publicProfile.displayName}</h1>
              <p className="text-sm text-gray-500">@{profile.publicProfile.handle}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>

        {/* Profile Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold">Handle</h3>
                  <p className="text-sm text-gray-600">@{profile.publicProfile.handle}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Display Name</h3>
                  <p className="text-sm text-gray-600">{profile.publicProfile.displayName}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Paymail</h3>
                  <p className="text-sm text-gray-600">{profile.paymail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet2 className="w-5 h-5" />
                Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold">Public Key</h3>
                  <p className="text-sm text-gray-600 break-all">{profile.publicKey}</p>
                </div>
                <div>
                  <h3 className="font-semibold">BSV Address</h3>
                  <p className="text-sm text-gray-600 break-all">{profile.publicProfile.bsvAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}