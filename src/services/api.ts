// src/services/api.ts
const API_BASE_URL = 'https://6yui8nj2ic.execute-api.us-east-1.amazonaws.com/dev'; 

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

interface Item {
  item_name: string;
  sku: string;
  size: string;
  bin: string;
  ln: string;
  qty: number;
  price?: number;
  last_updated: Date;
}

export interface Order { // Export Order interface for use in WMSInterface
  order_id: string;
  customer: string;
  timestamp: Date;
  item_list: Item[];
  tracking_number: string | null;
  address: string;
  subtotal: number;
  customer_email: string;
  customer_phone: string;
  carrier: string | null;
  shipping_method: string | null;
  status: OrderStatus;
}

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
      timestamp: new Date(order.timestamp),
      item_list: order.item_list.map((item: any) => ({
        ...item,
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
  newStatus: string
): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/order/${orderId}`, {
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
      item_list: data.item_list.map((item: any) => ({
        ...item,
        last_updated: new Date(item.last_updated),
      })),
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};
