import { Product, ShoppingListItem } from './interfaces.js';

export class ShoppingList {
  private items: ShoppingListItem[];

  constructor() {
    this.items = [];
  }

  addItem(product: Product, quantity: number): void {
    const newItem: ShoppingListItem = {
      id: this.items.length + 1,
      product: product,
      quantity: quantity
    };
    this.items.push(newItem);
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  updateQuantity(id: number, newQuantity: number): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items[index].quantity = newQuantity;
    }
  }

  getAllItems(): ShoppingListItem[] {
    return this.items;
  }
}
