import { HandCashConnect } from "@handcash/handcash-connect";
import { handCashConnect } from "../config/handcash";

export interface AttributeFilter {
  name: string;
  displayType: "string" | "number";
  operation: "equal" | "greater" | "lower";
  value: string | number;
}

export interface GetItemsFilter {
  from?: number;
  to?: number;
  collectionId?: string;
  searchString?: string;
  groupingValue?: string;
  fetchAttributes?: boolean;
  sort?: "name";
  order?: "asc" | "desc";
  attributes?: AttributeFilter[];
  appId?: string;
  group?: boolean;
  externalId?: string;
}

export async function getUserInventory(
  authToken: string,
  filters: GetItemsFilter = {},
) {
  try {
    const account = handCashConnect.getAccountFromAuthToken(authToken);
    const inventory = await account.items.getItemsInventory({
      from: filters.from || 0,
      to: filters.to || 50,
      ...filters,
    });

    return inventory;
  } catch (error) {
    console.error("Error fetching user inventory:", error);
    throw new Error("Failed to fetch user inventory");
  }
}

export async function getFilteredInventory(
  authToken: string,
  collectionId?: string,
  searchString?: string,
  attributes?: AttributeFilter[],
) {
  try {
    const account = handCashConnect.getAccountFromAuthToken(authToken);
    const params: GetItemsFilter = {
      from: 0,
      to: 50,
      collectionId,
      searchString,
      attributes,
      fetchAttributes: true,
    };

    const inventory = await account.items.getItemsInventory(params);
    console.log("Inventory:", inventory);
    return inventory;
  } catch (error) {
    console.error("Error fetching filtered inventory:", error);
    throw new Error("Failed to fetch filtered inventory");
  }
}
