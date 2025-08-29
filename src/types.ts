export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface ItemOld {
  item_name: string;
  sku: string;
  size: string;
  bin: string;
  ln: string;
  qty: number;
  price?: number;
  last_updated: Date;
}

export interface Item {
  sku: string;
  item_desc: string;
  bin: string;
  dsu: string;
  item_type?: string;
  qty: number;
  price: number;
  last_updated: Date;
}

export interface Order {
  order_id: string;
  customer: string;
  customer_id: string;
  timestamp: Date;
  item_list: Item[];
  tracking_number: string | null;
  address: string;
  subtotal: number;  
  customer_phone: string;
  carrier: string | null;
  shipping_method: string | null;
  status: OrderStatus;
}
