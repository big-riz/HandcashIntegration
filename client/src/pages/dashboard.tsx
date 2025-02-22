import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  LogOut,
  User,
  Wallet2,
  DollarSign,
  QrCode,
  History,
  Plus,
  Package,
  Library,
} from "lucide-react";
import { HandCashProfile } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PaymentRequest {
  id: number;
  status: string;
  amount: number;
  createdAt: string;
  paymentRequestUrl: string;
  qrCodeUrl: string;
  webhookEvents: Array<{
    id: number;
    eventType: string;
    createdAt: string;
  }>;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  count: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    paymentUrl: string;
    qrCodeUrl: string;
  } | null>(null);

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<HandCashProfile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: paymentRequests, isLoading: paymentsLoading } = useQuery<
    PaymentRequest[]
  >({
    queryKey: ["/api/payment-requests"],
    enabled: !!profile,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory?collectionId=67896865762b4e5c75343c6e"],
    enabled: !!profile,
  });

  const createPaymentRequest = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/payment-requests", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      setPaymentDetails(data);
      setShowPaymentDialog(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment request",
        variant: "destructive",
      });
    },
  });

  // Handle unauthenticated state
  if (profileError) {
    toast({
      title: "Error",
      description: "Failed to load profile. Please try connecting again.",
      variant: "destructive",
    });
    setLocation("/");
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePayment = () => {
    createPaymentRequest.mutate();
  };

  const handleMintItem = () => {
    setLocation("/mint");
  };

  const handleViewCollections = () => {
    setLocation("/collections");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage
                src={profile.publicProfile.avatarUrl}
                alt={profile.publicProfile.displayName}
              />
              <AvatarFallback>
                {profile.publicProfile.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.publicProfile.displayName}
              </h1>
              <p className="text-sm text-gray-500">
                @{profile.publicProfile.handle}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleViewCollections}>
              <Library className="w-4 h-4 mr-2" />
              Collections
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Profile and Wallet Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
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
                  <p className="text-sm text-gray-600">
                    @{profile.publicProfile.handle}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Display Name</h3>
                  <p className="text-sm text-gray-600">
                    {profile.publicProfile.displayName}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Paymail</h3>
                  <p className="text-sm text-gray-600">{profile.paymail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Card */}
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
                  <p className="text-sm text-gray-600 break-all">
                    {profile.publicKey}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">BSV Address</h3>
                  <p className="text-sm text-gray-600 break-all">
                    {profile.publicProfile.bsvAddress}
                  </p>
                </div>
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleCreatePayment}
                    disabled={createPaymentRequest.isPending}
                    className="w-full"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Request 1 Cent Payment
                  </Button>
                  <Button
                    onClick={handleMintItem}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Mint Test Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Your Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !inventory?.length ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No items in your inventory</p>
                <Button
                  onClick={handleMintItem}
                  variant="outline"
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Mint Your First Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map((item) => (
                  <Card
                    key={item.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-4">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      )}
                      <h3 className="font-semibold text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.description}
                      </p>
                      <div className="mt-2 flex justify-between items-center">
                        <Badge variant="secondary">
                          Quantity: {item.count}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !paymentRequests?.length ? (
              <p className="text-center text-gray-500 py-4">
                No payment requests yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {format(
                          new Date(request.createdAt),
                          "MMM d, yyyy HH:mm",
                        )}
                      </TableCell>
                      <TableCell>
                        ${(request.amount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(request.status)}
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {request.webhookEvents.map((event) => (
                            <div
                              key={event.id}
                              className="text-xs text-gray-500"
                            >
                              {format(new Date(event.createdAt), "HH:mm:ss")} -{" "}
                              {event.eventType}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment Request</DialogTitle>
            </DialogHeader>
            {paymentDetails && (
              <div className="grid gap-4">
                <div className="flex justify-center">
                  <img
                    src={paymentDetails.qrCodeUrl}
                    alt="Payment QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <Button
                  onClick={() =>
                    window.open(paymentDetails.paymentUrl, "_blank")
                  }
                  className="w-full"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Open Payment Page
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
