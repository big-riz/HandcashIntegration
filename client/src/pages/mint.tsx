import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function MintPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "Test NFT",
    description: "A test NFT item",
    imageUrl: "https://res.cloudinary.com/dcerwavw6/image/upload/v1731101495/bober.exe_to3xyg.png",
    tokenSupply: 1,
  });

  const mintMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item minted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mintMutation.mutate();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Mint Test Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenSupply">Token Supply</Label>
              <Input
                id="tokenSupply"
                type="number"
                value={formData.tokenSupply}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenSupply: parseInt(e.target.value) }))}
                disabled
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={mintMutation.isPending}
            >
              {mintMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint Test Item'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
