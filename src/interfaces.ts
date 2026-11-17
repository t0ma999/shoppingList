export interface Product {
  id: number;
  name: string;
  price: number;
}

export interface ShoppingListItem {
  id: number;
  product: Product;
  quantity: number;
}
