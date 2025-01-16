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

    // Create an item creation order
    const itemOrder = await account.items.createItemOrder({
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
        },
      }]
    });

    // Wait for the order to be ready
    await account.items.waitForItemOrder(itemOrder.id);

    // Get the order details
    const orderDetails = await account.items.getItemOrder(itemOrder.id);

    // Return the first item since we only create one at a time
    return orderDetails.items[0];
  } catch (error) {
    console.error('Error minting item:', error);
    throw new Error('Failed to mint item');
  }
}

export async function getUserItems(authToken: string) {
  try {
    const account = handCashConnect.getAccountFromAuthToken(authToken);
    const itemsData = await account.items.getUserItems();
    return itemsData.items;
  } catch (error) {
    console.error('Error fetching user items:', error);
    throw new Error('Failed to fetch user items');
  }
}