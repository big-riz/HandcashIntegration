import { HandCashConnect } from '@handcash/handcash-connect';
import { handCashConnect } from "../config/handcash";

export interface ItemProps {
  name: string;
  description: string;
  imageUrl: string;
  tokenSupply: number;
}

export async function mintItem(authToken: string, item: ItemProps) {
  try {
    const account = handCashConnect.getAccountFromAuthToken(authToken);

    // Create a collection for the items
    const collection = await account.cloudApi.post('/v1/collections', {
      name: "Test Collection",
      description: "A test collection for minted items",
      image: {
        url: "https://res.cloudinary.com/dcerwavw6/image/upload/v1731101495/bober.exe_to3xyg.png"
      }
    });

    // Create the item in the collection
    const createItemResponse = await account.cloudApi.post('/v1/items', {
      collectionId: collection.id,
      items: [{
        tokenSymbol: item.name.toUpperCase().replace(/\s+/g, '_'),
        name: item.name,
        description: item.description,
        image: {
          url: item.imageUrl,
        },
        tokenSupply: item.tokenSupply,
        rarity: {
          max: item.tokenSupply,
        }
      }]
    });

    // Wait for the item to be minted
    const itemId = createItemResponse.items[0].id;
    let itemStatus = await account.cloudApi.get(`/v1/items/${itemId}`);
    while (itemStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      itemStatus = await account.cloudApi.get(`/v1/items/${itemId}`);
    }

    return itemStatus;
  } catch (error) {
    console.error('Error minting item:', error);
    throw new Error('Failed to mint item');
  }
}

export async function getUserItems(authToken: string) {
  try {
    const account = handCashConnect.getAccountFromAuthToken(authToken);
    const response = await account.cloudApi.get('/v1/items');
    return response.items;
  } catch (error) {
    console.error('Error fetching user items:', error);
    throw new Error('Failed to fetch user items');
  }
}