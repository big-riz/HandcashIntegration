import { HandCashConnect } from "@handcash/handcash-connect";
import { HandCashMinter } from "@handcash/handcash-connect";
import { db } from "@db";
import { collections, items, seeds } from "@db/schema";
import { eq } from "drizzle-orm";
import { userInfo } from "os";
import { uuid } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

enum SeedEnum {
  "Fire",
  "Water",
  "Earth",
  "Air",
  "Light",
  "Dark"
}

export interface ItemProps {
  name: string;
  description: string;
  imageUrl: string;
  tokenSupply: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class HandCashMinterService {
  private account: any;

  constructor() {
    if (
      !process.env.HANDCASH_MINTER_APP_ID ||
      !process.env.HANDCASH_MINTER_APP_SECRET ||
      !process.env.HANDCASH_MINTER_AUTH_TOKEN
    ) {
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
      return await this.account.getOrderItems(orderId);
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
      return await this.account.getOrderItems(orderId);
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
    mediaDetails: {
      image: {
        url: "https://res.cloudinary.com/dcerwavw6/image/upload/v1731101495/bober.exe_to3xyg.png",
        contentType: "image/png",
      },
    },
  };

  console.log("Creating collection with params:", collection);

  // Create collection order
  const creationOrder = await minterService.createCollectionOrder(collection);
  console.log("Collection creation order:", creationOrder);

  // Wait for collection to be created in the background
  await sleep(5000);
  const orderItems = await minterService.getOrderItems(creationOrder.id);
  console.log("Collection order items:", orderItems);

  // The first item in the response is our collection
  const createdCollection = orderItems[0];
  console.log("Created collection:", createdCollection);

  if (!createdCollection || !createdCollection.id) {
    throw new Error("Failed to create collection: No collection ID received");
  }

  // Store collection in database
  const [savedCollection] = await db
    .insert(collections)
    .values({
      handcashCollectionId: createdCollection.id,
      name: collection.name,
      description: collection.description,
      imageUrl: collection.mediaDetails.image.url,
    })
    .returning();

  return savedCollection;
}

export async function mintItem(
  authToken: string,
  item: ItemProps,
  user: string,
) {
  try {

    const minterService = new HandCashMinterService();

    // Get or create collection
    const collection = await getOrCreateCollection();

    // Create the item order with proper metadata structure
    const createItemResponse = await minterService.createItemsOrder({
      collectionId: collection.handcashCollectionId,
      items: [
        {
          user: user,
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
        },
      ],
    });

    console.log("Item creation order response:", createItemResponse);

    // Wait for the order to be processed
    await sleep(5000);
    let orderStatus = await minterService.getItemOrder(createItemResponse.id);
    console.log("Initial order status:", orderStatus);

    while (orderStatus[0].origin === null) {
      await sleep(1000);
      orderStatus = await minterService.getItemOrder(createItemResponse.id);
      console.log("Updated order status:", orderStatus);
    }

    const createdItem = orderStatus[0];
    return {
      ...createdItem,
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

export async function makeItemProps(seedEnum: number, tokenSupply: number = 1, name: string = "Test Item", description: string = "Test Description", imageUrl: string = process.env.VITE_APP_URL+"/images/"+randomUUID()+"_test.png") {
  // copy image from public folder to public folder with filename as imageUrl
  const imagePath = path.join("./", 'public', imageUrl);
  fs.copyFileSync(path.join("./", 'public', seedEnum+'.png'), imagePath);
  await db.insert(seeds).values({
    imageUrl: imageUrl,
    seed: seedEnum,
    initTime: new Date(),
    active: false,
    tokenSupply: tokenSupply,
  })
  return {
    name: SeedEnum[seedEnum],
    description: description,
    imageUrl: imageUrl,
    tokenSupply: tokenSupply,
  } as ItemProps;
}