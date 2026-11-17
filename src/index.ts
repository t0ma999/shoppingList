import { Product } from './interfaces.js';

const apiUrl = 'http://127.0.0.1:3001/api/products';
const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Не найден элемент #app.');
}

app.innerHTML = `
  <h1>Список товаров</h1>
  <form id="product-form">
    <label>
      Название:
      <input id="product-name" name="name" type="text" maxlength="100" required />
    </label>
    <label>
      Цена:
      <input id="product-price" name="price" type="number" min="0" step="0.01" required />
    </label>
    <button id="submit-button" type="submit">Добавить товар</button>
    <button id="cancel-button" type="button" hidden>Отмена</button>
  </form>
  <p id="status" role="status"></p>
  <h2>Товары</h2>
  <ul id="products"></ul>
`;

const form = document.querySelector<HTMLFormElement>('#product-form')!;
const nameInput = document.querySelector<HTMLInputElement>('#product-name')!;
const priceInput = document.querySelector<HTMLInputElement>('#product-price')!;
const submitButton = document.querySelector<HTMLButtonElement>('#submit-button')!;
const cancelButton = document.querySelector<HTMLButtonElement>('#cancel-button')!;
const statusMessage = document.querySelector<HTMLElement>('#status')!;
const productsElement = document.querySelector<HTMLUListElement>('#products')!;

let editingId: number | null = null;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const result = await response.json() as { error?: string };
    throw new Error(result.error ?? `Ошибка запроса: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

function showStatus(message: string): void {
  statusMessage.textContent = message;
}

function resetForm(): void {
  form.reset();
  editingId = null;
  submitButton.textContent = 'Добавить товар';
  cancelButton.hidden = true;
}

function startEditing(product: Product): void {
  editingId = product.id;
  nameInput.value = product.name;
  priceInput.value = String(product.price);
  submitButton.textContent = 'Сохранить';
  cancelButton.hidden = false;
  nameInput.focus();
}

async function loadProducts(): Promise<void> {
  const products = await request<Product[]>(apiUrl);
  productsElement.replaceChildren();

  if (products.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = 'Товаров пока нет.';
    productsElement.append(emptyMessage);
    return;
  }

  for (const product of products) {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${product.name} — ${product.price.toFixed(2)}`;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Изменить';
    editButton.addEventListener('click', () => startEditing(product));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Удалить';
    deleteButton.addEventListener('click', () => void deleteProduct(product));

    item.append(label, ' ', editButton, ' ', deleteButton);
    productsElement.append(item);
  }
}

async function deleteProduct(product: Product): Promise<void> {
  try {
    await request<void>(`${apiUrl}/${product.id}`, { method: 'DELETE' });
    if (editingId === product.id) {
      resetForm();
    }
    await loadProducts();
    showStatus('Товар удалён.');
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Не удалось удалить товар.');
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const price = Number(priceInput.value);

  if (!name || !Number.isFinite(price) || price < 0) {
    showStatus('Введите название и неотрицательную цену.');
    return;
  }

  const wasEditing = editingId !== null;

  try {
    await request<Product>(
      editingId === null ? apiUrl : `${apiUrl}/${editingId}`,
      {
        method: editingId === null ? 'POST' : 'PUT',
        body: JSON.stringify({ name, price })
      }
    );
    resetForm();
    await loadProducts();
    showStatus(wasEditing ? 'Изменения сохранены.' : 'Товар добавлен.');
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Не удалось сохранить товар.');
  }
});

cancelButton.addEventListener('click', resetForm);

void loadProducts().catch(error => {
  showStatus(error instanceof Error ? error.message : 'Не удалось загрузить товары.');
});
