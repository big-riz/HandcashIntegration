import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LogOut, User } from "lucide-react";
import { HandCashProfile } from "@/lib/types";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useQuery<HandCashProfile>({
    queryKey: ['/api/profile'],
    retry: false,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to load profile. Please try connecting again.",
        variant: "destructive"
      });
      setLocation('/');
    }
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
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
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>

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
                <p className="text-sm text-gray-600">{profile.handle}</p>
              </div>
              <div>
                <h3 className="font-semibold">Display Name</h3>
                <p className="text-sm text-gray-600">{profile.displayName}</p>
              </div>
              <div>
                <h3 className="font-semibold">Paymail</h3>
                <p className="text-sm text-gray-600">{profile.paymail}</p>
              </div>
              <div>
                <h3 className="font-semibold">Public Profile</h3>
                <p className="text-sm text-gray-600">{profile.publicProfile ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}