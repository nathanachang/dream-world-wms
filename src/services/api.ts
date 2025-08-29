// src/services/api.ts
import { Item, Order, OrderStatus } from '../types';

const API_BASE_URL = 'https://9u8ga3cd25.execute-api.us-east-1.amazonaws.com/dev'; 

// GET /item
export const fetchItems = async (): Promise<Item[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/item`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Convert ISO string to Date objects
    return data.map((item: any) => ({
      sku: item.sku,
      item_desc: item.item_desc,
      bin: item.bin_loc,
      dsu: item.default_selling_unit,
      item_type: item.item_type,
      qty: parseInt(item.qty_on_hand, 10),
      price: parseFloat(item.price),
      last_updated: !item.last_updated ? new Date() : new Date(item.last_updated),
    }));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

// PATCH /item/{sku}
export const updateItem = async (
  sku: string,
  itemDetails: Partial<Item>
): Promise<Item> => {
  // Map frontend Item fields to backend DynamoDB fields
  const payload: { [key: string]: any } = {};
  if (itemDetails.item_desc !== undefined) payload.item_desc = itemDetails.item_desc;
  if (itemDetails.bin !== undefined) payload.bin_loc = itemDetails.bin;
  if (itemDetails.dsu !== undefined) payload.default_selling_unit = itemDetails.dsu;
  if (itemDetails.item_type !== undefined) payload.item_type = itemDetails.item_type;
  if (itemDetails.qty !== undefined) payload.qty_on_hand = itemDetails.qty;
  if (itemDetails.price !== undefined) payload.price = itemDetails.price;

  try {
    const response = await fetch(`${API_BASE_URL}/item/${sku}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

// GET /order
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/order`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Convert timestamp and item_list.last_updated to Date objects
    return data.map((order: any) => ({
      ...order,
      subtotal: parseFloat(order.subtotal),
      timestamp: new Date(order.timestamp),
      item_list: order.item_list.map((item: any) => ({
        ...item,
        qty: parseInt(item.qty, 10),
        price: parseFloat(item.price),
        last_updated: new Date(item.last_updated),
      })),
    }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// PATCH /order/{id}
export const updateOrderStatus = async (
  orderId: string,
  customerId: string,
  newStatus: string
): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/order/${customerId}/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      ...data,      
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

// PATCH /order/{id} - Tracking
export const updateOrderTracking = async (
  orderId: string,
  customerId: string,
  trackingDetails: { carrier: string; tracking_number: string }
): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/order/${customerId}/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingDetails),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      ...data,      
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    console.error("Error updating order tracking:", error);
    throw error;
  }
};