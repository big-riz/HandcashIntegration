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
    tokenSupply: 1,
    seed: 0,
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


            <div className="space-y-2">
              <Label htmlFor="tokenSupply">Token Supply</Label>
              <Input
                id="tokenSupply"
                type="number"
                value={formData.tokenSupply}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenSupply: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seed">Seed</Label>
              <Input
                id="seed"
                type="number"
                value={formData.seed}
                onChange={(e) => setFormData(prev => ({ ...prev, seed: parseInt(e.target.value) }))}
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
        </CardContent>
      </Card>
    </div>
  );
}
