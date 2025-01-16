import { HandCashConnect } from '@handcash/handcash-connect';
import { handCashConnect } from "../config/handcash";
import { nanoid } from 'nanoid';

export interface ItemProps {
  name: string;
  description: string;
  imageUrl: string;
  tokenSupply: number;
}

class HandCashCloudService {
  private account: any;
  private baseApiEndpoint = 'https://cloud.handcash.io';

  constructor(authToken: string) {
    this.account = handCashConnect.getAccountFromAuthToken(authToken);
  }

  private async sendRequest(method: string, endpoint: string, body?: any) {
    const timestamp = new Date().toISOString();
    const nonce = nanoid();
    const appId = process.env.VITE_HANDCASH_APP_ID!;
    const appSecret = process.env.VITE_HANDCASH_APP_SECRET!;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'App-Id': appId,
      'App-Secret': appSecret,
    };

    const response = await fetch(`${this.baseApiEndpoint}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HandCash API error:', errorText);
      throw new Error(`HandCash API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createCatalog(name: string, description: string, imageUrl: string) {
    return this.sendRequest('POST', '/v3/itemCatalog', {
      name,
      description,
      image: { url: imageUrl }
    });
  }

  async createItemsOrder(items: any[]) {
    return this.sendRequest('POST', '/v3/itemCreationOrder', {
      items
    });
  }

  async getItemOrder(orderId: string) {
    return this.sendRequest('GET', `/v3/itemCreationOrder/${orderId}`);
  }

  async getUserItems() {
    return this.sendRequest('GET', '/v3/items');
  }
}

export async function mintItem(authToken: string, item: ItemProps) {
  try {
    const cloudService = new HandCashCloudService(authToken);

    // Create a catalog for the items
    const catalog = await cloudService.createCatalog(
      "Test Collection",
      "A test collection for minted items",
      "https://res.cloudinary.com/dcerwavw6/image/upload/v1731101495/bober.exe_to3xyg.png"
    );

    // Create the item order
    const createItemResponse = await cloudService.createItemsOrder([{
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
    }]);

    // Wait for the order to be processed
    let orderStatus = await cloudService.getItemOrder(createItemResponse.id);
    while (orderStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      orderStatus = await cloudService.getItemOrder(createItemResponse.id);
    }

    return orderStatus.items[0];
  } catch (error) {
    console.error('Error minting item:', error);
    throw new Error('Failed to mint item');
  }
}

export async function getUserItems(authToken: string) {
  try {
    const cloudService = new HandCashCloudService(authToken);
    const response = await cloudService.getUserItems();
    return response.items;
  } catch (error) {
    console.error('Error fetching user items:', error);
    throw new Error('Failed to fetch user items');
  }
}