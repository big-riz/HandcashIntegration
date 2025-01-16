import { HandCashConnect } from "@handcash/handcash-connect";
import { HandCashMinter } from "@handcash/handcash-connect";
import { db } from "@db";
import { collections, items } from "@db/schema";
import { eq } from "drizzle-orm";

export interface ItemProps {
  name: string;
  description: string;
  imageUrl: string;
  tokenSupply: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class HandCashMinterService {
  private account: any;

  constructor() {
    if (!process.env.HANDCASH_MINTER_APP_ID || !process.env.HANDCASH_MINTER_APP_SECRET || !process.env.HANDCASH_MINTER_AUTH_TOKEN) {
      throw new Error("Missing minting credentials");
    }
    this.account = HandCashMinter.fromAppCredentials({
      appId: process.env.HANDCASH_MINTER_APP_ID,
      authToken: process.env.HANDCASH_MINTER_AUTH_TOKEN,
      appSecret: process.env.HANDCASH_MINTER_APP_SECRET,
    });
  }

  async createCollectionOrder(params: any) {
    try {
      return await this.account.createCollectionOrder(params);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  async getOrderItems(orderId: string) {
    try {
      return await this.account.getCreateItemsOrder(orderId);
    } catch (error) {
      console.error("Error getting order items:", error);
      throw error;
    }
  }

  async createItemsOrder(params: any) {
    try {
      return await this.account.createItemsOrder(params);
    } catch (error) {
      console.error("Error creating items order:", error);
      throw error;
    }
  }

  async getItemOrder(orderId: string) {
    try {
      return await this.account.getCreateItemsOrder(orderId);
    } catch (error) {
      console.error("Error getting item order:", error);
      throw error;
    }
  }

  async getUserItems() {
    try {
      return await this.account.getUserItems();
    } catch (error) {
      console.error("Error getting user items:", error);
      throw error;
    }
  }
}

async function getOrCreateCollection() {
  // Try to find existing collection
  const existingCollection = await db.query.collections.findFirst();

  if (existingCollection) {
    return existingCollection;
  }

  // Create new collection if none exists
  const minterService = new HandCashMinterService();

  const collection = {
    name: "Test Collection",
    description: "A test collection for minted items",
    image: {
      url: "https://res.cloudinary.com/dcerwavw6/image/upload/v1731101495/bober.exe_to3xyg.png",
      contentType: "image/png"
    }
  };

  // Create collection
  const creationOrder = await minterService.createCollectionOrder(collection);

  // Wait for collection to be created in the background
  await sleep(5000);
  const createdCollection = await minterService.getOrderItems(creationOrder.id);

  // Store collection in database
  const [savedCollection] = await db.insert(collections).values({
    handcashCollectionId: createdCollection.id,
    name: collection.name,
    description: collection.description,
    imageUrl: collection.image.url,
  }).returning();

  return savedCollection;
}

export async function mintItem(authToken: string, item: ItemProps) {
  try {
    const minterService = new HandCashMinterService();

    // Get or create collection
    const collection = await getOrCreateCollection();

    // Create the item order with proper metadata structure
    const createItemResponse = await minterService.createItemsOrder({
      collectionId: collection.handcashCollectionId,
      items: [{
        name: item.name,
        description: item.description,
        rarity: "Common",
        attributes: [
          { name: "Edition", value: "Test", displayType: "string" },
          { name: "Generation", value: "1", displayType: "string" },
        ],
        mediaDetails: {
          image: {
            url: item.imageUrl,
            contentType: "image/png",
          },
        },
        quantity: item.tokenSupply,
      }]
    });

    console.log("Item creation order response:", createItemResponse);

    // Wait for the order to be processed
    let orderStatus = await minterService.getItemOrder(createItemResponse.id);
    while (orderStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      orderStatus = await minterService.getItemOrder(createItemResponse.id);
    }

    return {
      ...orderStatus.items[0],
      collectionId: collection.id,
    };
  } catch (error) {
    console.error("Error minting item:", error);
    throw new Error("Failed to mint item");
  }
}

export async function getUserItems(authToken: string) {
  try {
    const minterService = new HandCashMinterService();
    const response = await minterService.getUserItems();
    return response.items;
  } catch (error) {
    console.error("Error fetching user items:", error);
    throw new Error("Failed to fetch user items");
  }
}