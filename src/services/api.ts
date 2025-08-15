// src/services/api.ts
import { Item, Order, OrderStatus } from '../types';

const API_BASE_URL = 'https://6yui8nj2ic.execute-api.us-east-1.amazonaws.com/dev'; 

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
      ...item,
      qty: parseInt(item.qty, 10),
      price: parseFloat(item.price),
      last_updated: new Date(item.last_updated),
    }));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

// PATCH /item/{id}
export const updateItemQuantity = async (
  sku: string,
  newQty: number
): Promise<Item> => {
  try {
    const response = await fetch(`${API_BASE_URL}/item/${sku}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qty: newQty }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return {
      ...data,
      last_updated: new Date(data.last_updated),
    };
  } catch (error) {
    console.error("Error updating inventory quantity:", error);
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
