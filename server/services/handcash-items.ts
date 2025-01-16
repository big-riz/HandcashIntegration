import { HandCashConnect } from '@handcash/handcash-connect';
import { handCashMinter } from "../config/handcash-minter";

export interface ItemProps {
  name: string;
  description: string;
  imageUrl: string;
  tokenSupply: number;
}

class HandCashMinterService {
  private account: any;

  constructor() {
    if (!process.env.HANDCASH_MINTER_AUTH_TOKEN) {
      throw new Error('Missing minter auth token');
    }
    this.account = handCashMinter.getAccountFromAuthToken(process.env.HANDCASH_MINTER_AUTH_TOKEN);
  }

  async createItemsOrder(items: any[]) {
    try {
      return await this.account.items.createItemsOrder({ items });
    } catch (error) {
      console.error('Error creating items order:', error);
      throw error;
    }
  }

  async getItemOrder(orderId: string) {
    try {
      return await this.account.items.getItemOrder(orderId);
    } catch (error) {
      console.error('Error getting item order:', error);
      throw error;
    }
  }

  async getUserItems() {
    try {
      return await this.account.items.getUserItems();
    } catch (error) {
      console.error('Error getting user items:', error);
      throw error;
    }
  }
}

export async function mintItem(authToken: string, item: ItemProps) {
  try {
    const minterService = new HandCashMinterService();

    // Create the item order with proper metadata structure
    const createItemResponse = await minterService.createItemsOrder([{
      name: item.name,
      description: item.description,
      rarity: "Common",
      attributes: [
        { name: "Edition", value: "Test", displayType: "string" },
        { name: "Generation", value: "1", displayType: "string" }
      ],
      mediaDetails: {
        image: {
          url: item.imageUrl,
          contentType: 'image/png'
        }
      },
      quantity: item.tokenSupply,
    }]);

    console.log('Item creation order response:', createItemResponse);

    // Wait for the order to be processed
    let orderStatus = await minterService.getItemOrder(createItemResponse.id);
    while (orderStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      orderStatus = await minterService.getItemOrder(createItemResponse.id);
    }

    return orderStatus.items[0];
  } catch (error) {
    console.error('Error minting item:', error);
    throw new Error('Failed to mint item');
  }
}

export async function getUserItems(authToken: string) {
  try {
    const minterService = new HandCashMinterService();
    const response = await minterService.getUserItems();
    return response.items;
  } catch (error) {
    console.error('Error fetching user items:', error);
    throw new Error('Failed to fetch user items');
  }
}