import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Collection {
  id: number;
  handcashCollectionId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface CollectionFilter {
  sort: 'name' | 'createdAt';
  order: 'asc' | 'desc';
  search: string;
}

export default function Collections() {
  const [filter, setFilter] = useState<CollectionFilter>({
    sort: 'createdAt',
    order: 'desc',
    search: '',
  });

  const { data: collections, isLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections", filter],
    // Add error handling here if needed.  For example:
    // onError: (error) => {console.error("Error fetching collections:", error)}
  });

  const filteredCollections = collections?.filter(collection => 
    collection.name.toLowerCase().includes(filter.search.toLowerCase()) ||
    collection.description?.toLowerCase().includes(filter.search.toLowerCase())
  ).sort((a, b) => {
    if (filter.sort === 'name') {
      return filter.order === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      return filter.order === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Collections</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search collections..."
          value={filter.search}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          className="max-w-sm"
        />
        <Select
          value={filter.sort}
          onValueChange={(value: 'name' | 'createdAt') => 
            setFilter(prev => ({ ...prev, sort: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Creation Date</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.order}
          onValueChange={(value: 'asc' | 'desc') => 
            setFilter(prev => ({ ...prev, order: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCollections?.map((collection) => (
          <Card key={collection.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{collection.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {collection.imageUrl && (
                <img
                  src={collection.imageUrl}
                  alt={collection.name}
                  className="w-full h-32 object-cover rounded-md mb-4"
                />
              )}
              <p className="text-sm text-gray-600 mb-2">
                {collection.description || "No description"}
              </p>
              <p className="text-xs text-gray-400">
                Created: {new Date(collection.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}